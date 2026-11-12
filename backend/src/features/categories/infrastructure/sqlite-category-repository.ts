import type { Banco } from "../../../database/conexao.js";
import { CategoryAlreadyExistsError } from "../application/create-category-service.js";
import { createCategory, type Category } from "../domain/category.js";
import type { CategoryCatalog, SavedCategory } from "../domain/category-repository.js";

// usuarioId deve vir da sessão, nunca do corpo da requisição.
// O nome é comparado exatamente, como nas metas: "Lazer" e "lazer" são categorias diferentes.
export function createSqliteCategoryRepository(db: Banco, usuarioId: number): CategoryCatalog {
  return {
    async findByName(name) {
      const { rows } = await db.execute({
        sql: "SELECT id, nome AS name FROM categorias WHERE usuario_id = ? AND nome = ?",
        args: [usuarioId, name],
      });
      return rows[0] ? (rows[0] as unknown as SavedCategory) : null;
    },
    async save(category: Category) {
      const valid = createCategory(category.name);
      // O índice UNIQUE (usuario_id, nome) também protege contra cadastros simultâneos.
      const result = await db.execute({
        sql: `INSERT INTO categorias (usuario_id, nome) VALUES (?, ?)
          ON CONFLICT(usuario_id, nome) DO NOTHING`,
        args: [usuarioId, valid.name],
      });
      if (result.rowsAffected === 0) throw new CategoryAlreadyExistsError(valid.name);
    },
    async list() {
      const { rows } = await db.execute({
        sql: "SELECT id, nome AS name FROM categorias WHERE usuario_id = ? ORDER BY nome, id",
        args: [usuarioId],
      });
      return rows as unknown as SavedCategory[];
    },
  };
}
