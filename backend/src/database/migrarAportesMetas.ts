import { aplicarMigration, type Banco } from "./aplicarMigration.js";

export function migrarAportesMetas(db: Banco): Promise<void> {
  return aplicarMigration(db, 7, [
    "CREATE UNIQUE INDEX metas_id_usuario ON metas(id, usuario_id)",
    `CREATE TABLE aportes_metas (
      id INTEGER PRIMARY KEY,
      meta_id INTEGER NOT NULL,
      usuario_id INTEGER NOT NULL,
      valor_em_centavos INTEGER NOT NULL CHECK (
        typeof(valor_em_centavos) = 'integer' AND
        valor_em_centavos BETWEEN 1 AND 9007199254740991
      ),
      FOREIGN KEY (meta_id, usuario_id) REFERENCES metas(id, usuario_id)
    )`,
    "CREATE INDEX aportes_metas_meta ON aportes_metas(meta_id)",
    `CREATE TRIGGER limitar_aportes_metas BEFORE INSERT ON aportes_metas
      WHEN COALESCE((SELECT SUM(valor_em_centavos) FROM aportes_metas WHERE meta_id = NEW.meta_id), 0)
        > 9007199254740991 - NEW.valor_em_centavos
      BEGIN SELECT RAISE(ABORT, 'Limite de centavos da meta excedido'); END`,
  ]);
}
