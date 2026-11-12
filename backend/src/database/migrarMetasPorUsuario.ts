import { aplicarMigration, type Banco } from "./aplicarMigration.js";

export function migrarMetasPorUsuario(db: Banco): Promise<void> {
  // Preserva os IDs e os dados legados sem atribuir um proprietário desconhecido.
  // NULL fica reservado às metas antigas, que não aparecem nas consultas por usuário.
  // O batch "write" de aplicarMigration desfaz tudo se qualquer comando falhar.
  return aplicarMigration(db, 6, [
    `CREATE TABLE metas_novas (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER REFERENCES usuarios(id),
      nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
      valor_alvo_em_centavos INTEGER NOT NULL CHECK (
        typeof(valor_alvo_em_centavos) = 'integer' AND
        valor_alvo_em_centavos BETWEEN 1 AND 9007199254740991
      ),
      UNIQUE (usuario_id, nome)
    )`,
    `INSERT INTO metas_novas (id, usuario_id, nome, valor_alvo_em_centavos)
      SELECT id, NULL, nome, valor_alvo_em_centavos FROM metas`,
    "DROP TABLE metas",
    "ALTER TABLE metas_novas RENAME TO metas",
  ]);
}
