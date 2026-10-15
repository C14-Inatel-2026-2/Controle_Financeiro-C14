import { describe, it, expect, beforeEach } from "vitest";
import { ValidadorDeCadastro } from "./ValidadorDeCadastro";

const dadosValidos = {
  nome: "Donatto",
  email: "donatto@email.com",
  senha: "12345678",
};

describe("ValidadorDeCadastro", () => {
  let validador: ValidadorDeCadastro;

  // Instância nova a cada teste, para um não interferir no outro.
  beforeEach(() => {
    validador = new ValidadorDeCadastro();
  });

  it("não retorna erros quando os dados são válidos", () => {
    expect(validador.validar(dadosValidos)).toEqual({});
  });

  it("exige o nome", () => {
    const erros = validador.validar({ ...dadosValidos, nome: "   " });
    expect(erros.nome).toBe("Informe seu nome.");
  });

  it("rejeita e-mail sem @", () => {
    const erros = validador.validar({ ...dadosValidos, email: "donatto.email.com" });
    expect(erros.email).toBe("Informe um e-mail válido.");
  });

  it("exige senha com pelo menos 8 caracteres", () => {
    expect(validador.validar({ ...dadosValidos, senha: "1234567" }).senha).toBeDefined();
    expect(validador.validar({ ...dadosValidos, senha: "12345678" }).senha).toBeUndefined();
  });
});