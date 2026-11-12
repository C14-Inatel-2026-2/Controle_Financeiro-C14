import type { Banco } from "../database/conexao.js";
import { ValidationError } from "../errors/userErrors.js";

// Categoria inexistente e categoria de outra conta recebem a mesma resposta,
// para não revelar IDs que pertencem a outros usuários.
export async function validarCategoriaDoUsuario(db: Banco, usuarioId: number, categoriaId: unknown): Promise<void> {
  if (typeof categoriaId !== "number" || !Number.isSafeInteger(categoriaId) || categoriaId <= 0) {
    throw new ValidationError("categoriaId deve ser um inteiro positivo.", "categoriaId");
  }
  const { rows } = await db.execute({
    sql: "SELECT id FROM categorias WHERE id = ? AND usuario_id = ?",
    args: [categoriaId, usuarioId],
  });
  if (rows.length === 0) {
    throw new ValidationError("Categoria não encontrada.", "categoriaId");
  }
}
