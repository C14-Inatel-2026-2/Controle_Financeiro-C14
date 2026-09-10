import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function abrirBanco(caminho = "data/financeiro.sqlite"): DatabaseSync {
  if (caminho !== ":memory:") mkdirSync(dirname(resolve(caminho)), { recursive: true });
  const db = new DatabaseSync(caminho);
  try {
    db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    migrarBanco(db);
    return db;
  } catch (erro) {
    db.close();
    throw erro;
  }
}

export function migrarBanco(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS migrations (versao INTEGER PRIMARY KEY)");
  if (db.prepare("SELECT versao FROM migrations WHERE versao = 1").get()) return;
  db.exec("BEGIN");
  try {
    db.exec(`
      CREATE TABLE usuarios (
        id INTEGER PRIMARY KEY,
        nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
        email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(email)) > 0),
        senha_hash TEXT NOT NULL CHECK (length(senha_hash) > 0)
      );
      CREATE TABLE movimentacoes (
        id INTEGER PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        descricao TEXT NOT NULL CHECK (length(trim(descricao)) > 0),
        tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
        valor_em_centavos INTEGER NOT NULL CHECK (
          typeof(valor_em_centavos) = 'integer' AND
          valor_em_centavos BETWEEN 0 AND 9007199254740991
        ),
        data TEXT NOT NULL CHECK (
          length(data) = 10 AND data GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          AND date(data, '+0 days') IS NOT NULL AND date(data, '+0 days') = data
        )
      );
      CREATE INDEX movimentacoes_usuario_data ON movimentacoes(usuario_id, data);
      INSERT INTO migrations (versao) VALUES (1);
    `);
    db.exec("COMMIT");
  } catch (erro) {
    db.exec("ROLLBACK");
    throw erro;
  }
}
