import { describe, it, expect, vi, afterEach } from "vitest";
import { cadastrarUsuario } from "./cadastrarUsuario";

const dados = {
  nome: "Donatto",
  email: "donattopieve@email.com",
  senha: "12345678",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cadastrarUsuario", () => {
  it("envia os dados para a API e devolve o usuário criado", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, nome: "Donatto", email: "donatto@email.com" }),
    });
    vi.stubGlobal("fetch", fetchFalso);

    const usuario = await cadastrarUsuario(dados);

    expect(usuario).toEqual({ id: 1, nome: "Donatto", email: "donatto@email.com" });
    expect(fetchFalso).toHaveBeenCalledTimes(1);

    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe("/api/users");
    expect(opcoes.method).toBe("POST");
    expect(JSON.parse(opcoes.body)).toEqual(dados);
  });

  it("avisa quando o e-mail já está cadastrado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 409 }),
    );

    await expect(cadastrarUsuario(dados)).rejects.toThrow(
      "Este e-mail já está cadastrado.",
    );
  });

  it("avisa quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    await expect(cadastrarUsuario(dados)).rejects.toThrow(
      "Não foi possível cadastrar",
    );
  });
});