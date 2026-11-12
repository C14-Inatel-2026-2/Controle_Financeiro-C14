import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { loginService } from "../../../src/services/loginService.js";
import { CredenciaisInvalidasError, ValidationError } from "../../../src/errors/userErrors.js";
import { createUserService } from "../../../src/services/createUserService.js";
import { exigirSessao, lerTokenDoCookie } from "../../../src/middlewares/sessao.js";
import type { Credenciais } from "../../../src/repositories/credenciais.js";

// Gera um hash real pelo mesmo serviço do cadastro, sem abrir banco.
async function cadastrarFalso(senha: string): Promise<Credenciais> {
  let senha_hash = "";
  const repositorio = {
    buscarPorEmail: vi.fn().mockResolvedValue(undefined),
    inserir: vi.fn(async (novo: { senha_hash: string }) => { senha_hash = novo.senha_hash; return 7; }),
  };
  const usuario = await createUserService({ nome: "Ana", email: "ana@example.test", senha }, repositorio);
  return { ...usuario, senha_hash };
}

describe("loginService", () => {
  it("aceita a senha cadastrada e devolve o usuário sem o hash", async () => {
    const credenciais = await cadastrarFalso("senha-correta");
    const buscar = vi.fn().mockReturnValue(credenciais);
    const usuario = await loginService({ email: "  ANA@example.test ", senha: "senha-correta" }, buscar);
    expect(buscar).toHaveBeenCalledWith("ana@example.test");
    expect(usuario).toEqual({ id: 7, nome: "Ana", email: "ana@example.test" });
  });

  it("rejeita senha errada", async () => {
    const credenciais = await cadastrarFalso("senha-correta");
    await expect(loginService({ email: "ana@example.test", senha: "senha-errada" }, () => credenciais))
      .rejects.toThrow(CredenciaisInvalidasError);
  });

  it("rejeita e-mail inexistente com o mesmo erro da senha errada", async () => {
    await expect(loginService({ email: "nao@example.test", senha: "qualquer-senha" }, () => undefined))
      .rejects.toThrow("E-mail ou senha incorretos.");
  });

  it("aceita hash gravado antes da extração do módulo de senhas", async () => {
    // Hash fixo no formato scrypt:<salt>:<hash>, gerado com o código anterior ao refactoring.
    const credenciais = {
      id: 3, nome: "Cris", email: "cris@example.test",
      senha_hash: "scrypt:0123456789abcdef0123456789abcdef:b9438919883baa2968e325da1f63bd603522d1cea14aade5bbea4a66d25ee60f99945902b485913a60b5e65788ac56ddcd23f3258b5fa2724cb77f72e3071c17",
    };
    await expect(loginService({ email: "cris@example.test", senha: "senha-antiga-123" }, () => credenciais))
      .resolves.toEqual({ id: 3, nome: "Cris", email: "cris@example.test" });
    await expect(loginService({ email: "cris@example.test", senha: "senha-antiga-124" }, () => credenciais))
      .rejects.toThrow(CredenciaisInvalidasError);
  });

  it("rejeita hash gravado em formato desconhecido", async () => {
    const credenciais = { id: 1, nome: "Ana", email: "ana@example.test", senha_hash: "texto-puro" };
    await expect(loginService({ email: "ana@example.test", senha: "texto-puro" }, () => credenciais))
      .rejects.toThrow(CredenciaisInvalidasError);
  });

  it.each([
    null, [], "texto", {}, { email: "ana@example.test" }, { senha: "12345678" },
    { email: " ", senha: "12345678" }, { email: 1, senha: "12345678" },
    { email: "ana@example.test", senha: "" }, { email: "ana@example.test", senha: 12345678 },
  ])("rejeita entrada inválida sem consultar o banco: %j", async (corpo) => {
    const buscar = vi.fn();
    await expect(loginService(corpo, buscar)).rejects.toThrow(ValidationError);
    expect(buscar).not.toHaveBeenCalled();
  });
});

describe("Cookie e middleware de sessão", () => {
  it("lê o token do cookie sessao entre outros cookies", () => {
    expect(lerTokenDoCookie("tema=escuro; sessao=abc-123; outro=1")).toBe("abc-123");
    expect(lerTokenDoCookie("tema=escuro")).toBeUndefined();
    expect(lerTokenDoCookie(undefined)).toBeUndefined();
  });

  it("exigirSessao responde 401 sem usuário e segue com usuário", () => {
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ json }) } as unknown as Response;
    const next = vi.fn();
    exigirSessao({} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();

    exigirSessao({ usuario: { id: 3 } } as Request, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
