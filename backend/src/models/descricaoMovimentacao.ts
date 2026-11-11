import { ValidationError } from "../errors/userErrors.js";

export const LIMITE_DESCRICAO_MOVIMENTACAO = 200;

// Retorna o texto que será gravado: espaços externos não contam no limite.
export function normalizarDescricaoMovimentacao(descricao: unknown): string {
  if (typeof descricao !== "string" || descricao.trim() === "") {
    throw new ValidationError("Informe a descrição da movimentação.", "descricao");
  }
  const texto = descricao.trim();
  if (texto.length > LIMITE_DESCRICAO_MOVIMENTACAO) {
    throw new ValidationError(
      `A descrição deve ter no máximo ${LIMITE_DESCRICAO_MOVIMENTACAO} caracteres.`,
      "descricao",
    );
  }
  return texto;
}
