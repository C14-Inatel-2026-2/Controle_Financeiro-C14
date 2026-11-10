import type { DatabaseSync } from "node:sqlite";
import { ValidationError } from "../errors/userErrors.js";

// Categoria inexistente e categoria de outra conta recebem a mesma resposta,
// para não revelar IDs que pertencem a outros usuários.
export function validarCategoriaDoUsuario(db: DatabaseSync, usuarioId: number, categoriaId: unknown): void {
  if (typeof categoriaId !== "number" || !Number.isSafeInteger(categoriaId) || categoriaId <= 0) {
    throw new ValidationError("categoriaId deve ser um inteiro positivo.", "categoriaId");
  }
  const categoria = db.prepare("SELECT id FROM categorias WHERE id = ? AND usuario_id = ?").get(categoriaId, usuarioId);
  if (!categoria) {
    throw new ValidationError("Categoria não encontrada.", "categoriaId");
  }
}
