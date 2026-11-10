import type { DatabaseSync } from "node:sqlite";

export function migrarSessoes(db: DatabaseSync): void {
  if (db.prepare("SELECT versao FROM migrations WHERE versao = 4").get()) return;
  db.exec("BEGIN");
  try {
    db.exec(`
      CREATE TABLE sessoes (
        token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        expira_em INTEGER NOT NULL
      );
      CREATE INDEX sessoes_usuario ON sessoes(usuario_id);
      INSERT INTO migrations (versao) VALUES (4);
    `);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
