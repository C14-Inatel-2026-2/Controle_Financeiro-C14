import { aplicarMigration, type Banco } from "./aplicarMigration.js";

export function migrarImportacoes(db: Banco): Promise<void> {
  return aplicarMigration(db, 3, [
    `CREATE TABLE importacoes_faturas (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      fingerprint TEXT NOT NULL CHECK (length(fingerprint) = 64),
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      total_em_centavos INTEGER NOT NULL CHECK (
        typeof(total_em_centavos) = 'integer' AND total_em_centavos BETWEEN 0 AND 9007199254740991
      ),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (usuario_id, fingerprint)
    )`,
    `CREATE TABLE importacao_lancamentos (
      importacao_id INTEGER NOT NULL REFERENCES importacoes_faturas(id),
      movimentacao_id INTEGER NOT NULL UNIQUE REFERENCES movimentacoes(id),
      PRIMARY KEY (importacao_id, movimentacao_id)
    )`,
  ]);
}
