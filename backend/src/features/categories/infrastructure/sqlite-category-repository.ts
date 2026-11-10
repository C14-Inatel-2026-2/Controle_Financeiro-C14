import type { DatabaseSync } from "node:sqlite";
import { CategoryAlreadyExistsError } from "../application/create-category-service.js";
import { createCategory, type Category } from "../domain/category.js";
import type { CategoryCatalog, SavedCategory } from "../domain/category-repository.js";

// usuarioId deve vir da sessão, nunca do corpo da requisição.
// O nome é comparado exatamente, como nas metas: "Lazer" e "lazer" são categorias diferentes.
export function createSqliteCategoryRepository(db: DatabaseSync, usuarioId: number): CategoryCatalog {
  return {
    async findByName(name) {
      const row = db.prepare("SELECT id, nome AS name FROM categorias WHERE usuario_id = ? AND nome = ?")
        .get(usuarioId, name);
      return row ? (row as unknown as SavedCategory) : null;
    },
    async save(category: Category) {
      const valid = createCategory(category.name);
      // O índice UNIQUE (usuario_id, nome) também protege contra cadastros simultâneos.
      const result = db.prepare(`INSERT INTO categorias (usuario_id, nome) VALUES (?, ?)
        ON CONFLICT(usuario_id, nome) DO NOTHING`).run(usuarioId, valid.name);
      if (result.changes === 0) throw new CategoryAlreadyExistsError(valid.name);
    },
    async list() {
      return db.prepare("SELECT id, nome AS name FROM categorias WHERE usuario_id = ? ORDER BY nome, id")
        .all(usuarioId) as unknown as SavedCategory[];
    },
  };
}
