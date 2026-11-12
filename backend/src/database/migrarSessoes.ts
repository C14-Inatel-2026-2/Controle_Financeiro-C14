import { aplicarMigration, type Banco } from "./aplicarMigration.js";

export function migrarSessoes(db: Banco): Promise<void> {
  return aplicarMigration(db, 4, [
    `CREATE TABLE sessoes (
      token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      expira_em INTEGER NOT NULL
    )`,
    "CREATE INDEX sessoes_usuario ON sessoes(usuario_id)",
  ]);
}
