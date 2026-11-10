import type { DatabaseSync } from "node:sqlite";

export function migrarCategorias(db: DatabaseSync): void {
  if (db.prepare("SELECT versao FROM migrations WHERE versao = 5").get()) return;
  db.exec("BEGIN");
  try {
    // A coluna nova nasce NULL: lançamentos antigos e importados ficam sem categoria.
    db.exec(`
      CREATE TABLE categorias (
        id INTEGER PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
        UNIQUE (usuario_id, nome)
      );
      ALTER TABLE movimentacoes ADD COLUMN categoria_id INTEGER REFERENCES categorias(id);
      CREATE INDEX movimentacoes_categoria ON movimentacoes(categoria_id);
      INSERT INTO migrations (versao) VALUES (5);
    `);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
