import { describe, expect, it } from "vitest";

import { lerDadosCadastro } from "../../src/controllers/lerDadosCadastro.js";
import { ValidationError } from "../../src/errors/userErrors.js";

describe("lerDadosCadastro", () => {
  it("retorna os campos de cadastro e ignora campos extras", () => {
    const entrada = {
      nome: "Ana",
      email: "ana@example.com",
      senha: "senha12345",
      campoExtra: "não deve seguir para o service",
    };

    const resultado = lerDadosCadastro(entrada);

    expect(resultado).toEqual({
      nome: "Ana",
      email: "ana@example.com",
      senha: "senha12345",
    });
  });

  it("rejeita senha enviada como número", () => {
    const entrada = {
      nome: "Ana",
      email: "ana@example.com",
      senha: 12345678,
    };

    expect(() => lerDadosCadastro(entrada)).toThrow(
      ValidationError,
    );
  });
});