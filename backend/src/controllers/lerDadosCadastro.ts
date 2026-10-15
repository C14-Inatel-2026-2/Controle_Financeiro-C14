import type { DadosCadastro } from "../models/user.js";
import { ValidationError } from "../errors/userErrors.js";

export function lerDadosCadastro(corpo: unknown): DadosCadastro {
  if (
    typeof corpo !== "object" ||
    corpo === null ||
    Array.isArray(corpo)
  ) {
    throw new ValidationError(
      "O corpo da requisição deve ser um objeto.",
    );
  }

  if (!("nome" in corpo) || typeof corpo.nome !== "string") {
    throw new ValidationError(
      "O nome deve ser informado como texto.",
      "nome",
    );
  }

  if (!("email" in corpo) || typeof corpo.email !== "string") {
    throw new ValidationError(
      "O e-mail deve ser informado como texto.",
      "email",
    );
  }

  if (!("senha" in corpo) || typeof corpo.senha !== "string") {
    throw new ValidationError(
      "A senha deve ser informada como texto.",
      "senha",
    );
  }

  return {
    nome: corpo.nome,
    email: corpo.email,
    senha: corpo.senha,
  };
}