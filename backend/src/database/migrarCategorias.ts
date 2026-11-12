import { aplicarMigration, type Banco } from "./aplicarMigration.js";

export function migrarCategorias(db: Banco): Promise<void> {
  // A coluna nova nasce NULL: lançamentos antigos e importados ficam sem categoria.
  return aplicarMigration(db, 5, [
    `CREATE TABLE categorias (
      id INTEGER PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
      nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
      UNIQUE (usuario_id, nome)
    )`,
    "ALTER TABLE movimentacoes ADD COLUMN categoria_id INTEGER REFERENCES categorias(id)",
    "CREATE INDEX movimentacoes_categoria ON movimentacoes(categoria_id)",
  ]);
}
