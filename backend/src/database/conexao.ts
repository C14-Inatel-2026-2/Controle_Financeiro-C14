import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { migrarImportacoes } from "./migrarImportacoes.js";
import { migrarSessoes } from "./migrarSessoes.js";
import { migrarCategorias } from "./migrarCategorias.js";
import { aplicarMigration, type Banco } from "./aplicarMigration.js";

export type { Banco };

// Local: { caminho }. Turso: { url, authToken }. Veja lerConfigBanco em config.ts.
export type ConfigBanco = { caminho: string } | { url: string; authToken: string };

function criarCliente(config: ConfigBanco): Client {
  if ("url" in config) return createClient({ url: config.url, authToken: config.authToken });
  if (config.caminho === ":memory:") return createClient({ url: ":memory:" });
  const arquivo = resolve(config.caminho);
  mkdirSync(dirname(arquivo), { recursive: true });
  // libSQL espera "file:" com barras normais, também no Windows.
  return createClient({ url: `file:${arquivo.replaceAll("\\", "/")}` });
}

// Abre o banco e aplica as migrations. Se algo falhar, fecha a conexão e repassa o erro:
// com o Turso configurado, a aplicação não cai para um arquivo local.
export async function abrirBanco(config: ConfigBanco | string = "data/financeiro.sqlite"): Promise<Client> {
  const db = criarCliente(typeof config === "string" ? { caminho: config } : config);
  try {
    await migrarBanco(db);
    return db;
  } catch (erro) {
    db.close();
    throw erro;
  }
}

export async function migrarBanco(db: Banco): Promise<void> {
  await db.execute("CREATE TABLE IF NOT EXISTS migrations (versao INTEGER PRIMARY KEY)");
  await aplicarMigration(db, 1, [
    `CREATE TABLE usuarios (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL CHECK (length(trim(nome)) > 0),
      email TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(trim(email)) > 0),
      senha_hash TEXT NOT NULL CHECK (length(senha_hash) > 0)
    )`,
    `CREATE TABLE movimentacoes (
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
    )`,
    "CREATE INDEX movimentacoes_usuario_data ON movimentacoes(usuario_id, data)",
  ]);
  await aplicarMigration(db, 2, [
    `CREATE TABLE metas (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE CHECK (length(trim(nome)) > 0),
      valor_alvo_em_centavos INTEGER NOT NULL CHECK (
        typeof(valor_alvo_em_centavos) = 'integer' AND
        valor_alvo_em_centavos BETWEEN 1 AND 9007199254740991
      )
    )`,
  ]);
  await migrarImportacoes(db);
  await migrarSessoes(db);
  await migrarCategorias(db);
}
