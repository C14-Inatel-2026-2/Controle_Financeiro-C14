import { describe, expect, it, vi } from "vitest";
import { createUserService } from "../../src/services/createUserService";
import { FakeUserRepository } from "../mocks/fakeUserRepository";

const dadosValidos = { nome: " José ", email: " JOSE@example.test ", senha: "12345678" };

describe("createUserService", () => {
  it("cadastra usuário válido, normaliza os dados e persiste somente o hash", async () => {
    const repository = new FakeUserRepository();
    const inserir = vi.spyOn(repository, "inserir");

    const usuario = await createUserService(dadosValidos, repository);

    expect(usuario).toEqual({ id: 1, nome: "José", email: "jose@example.test" });
    expect(inserir).toHaveBeenCalledTimes(1);
    expect(repository.usuarios).toHaveLength(1);
    const persistido = repository.usuarios[0];
    expect(persistido).toMatchObject(usuario);
    expect(persistido).not.toHaveProperty("senha");
    expect(persistido.senha_hash).not.toBe(dadosValidos.senha);
    expect(persistido.senha_hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(usuario).not.toHaveProperty("senha");
    expect(usuario).not.toHaveProperty("senha_hash");
  });

  it.each([
    ["e-mail inválido", { email: "jose.example.test" }, "Informe um e-mail válido."],
    ["senha curta", { senha: "1234567" }, "A senha deve ter pelo menos 8 caracteres."],
    ["nome vazio após trim", { nome: "   " }, "Informe seu nome."],
  ])("rejeita %s antes de acessar o repository", async (_cenario, alteracao, mensagem) => {
    const repository = new FakeUserRepository();
    const buscar = vi.spyOn(repository, "buscarPorEmail");
    const inserir = vi.spyOn(repository, "inserir");

    await expect(createUserService({ ...dadosValidos, ...alteracao }, repository)).rejects.toThrow(mensagem);

    expect(buscar).not.toHaveBeenCalled();
    expect(inserir).not.toHaveBeenCalled();
    expect(repository.usuarios).toHaveLength(0);
  });

  it("rejeita e-mail duplicado independentemente de espaços externos e caixa", async () => {
    const repository = new FakeUserRepository();
    await repository.inserir({ nome: "José", email: "JOSE@example.test", senha_hash: "hash-ficticio" });
    const inserir = vi.spyOn(repository, "inserir");

    await expect(createUserService(dadosValidos, repository)).rejects.toThrow("E-mail já cadastrado.");

    expect(inserir).not.toHaveBeenCalled();
    expect(repository.usuarios).toHaveLength(1);
  });
});
