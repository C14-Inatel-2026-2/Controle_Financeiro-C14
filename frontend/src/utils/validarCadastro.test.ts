import { describe, it, expect } from "vitest";
import { validarCadastro } from "./validarCadastro";

const dadosValidos = {
    nome: "Donatto",
    email: "donatto@gmail.com",
    senha: "12345678",
};

describe("validarCadastro", () => {
  it("não retorna erros quando os dados são válidos", () => {
    expect(validarCadastro(dadosValidos)).toEqual({});
  });
  it("exige o nome", () => {
    const erros = validarCadastro({ ...dadosValidos, nome: "   " });
    expect(erros.nome).toBe("Informe seu nome.");
  });
  it("rejeita e-mail sem @", () => {
    const erros = validarCadastro({ ...dadosValidos, email: "maria.email.com" });
    expect(erros.email).toBe("Informe um e-mail válido.");
  });

  it("exige senha com pelo menos 8 caracteres", () => {
    expect(validarCadastro({ ...dadosValidos, senha: "1234567" }).senha).toBeDefined();
    expect(validarCadastro({ ...dadosValidos, senha: "12345678" }).senha).toBeUndefined();
  });
});