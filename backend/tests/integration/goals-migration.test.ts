import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { abrirBanco, migrarBanco } from "../../src/database/conexao.js";
import { migrarMetasPorUsuario } from "../../src/database/migrarMetasPorUsuario.js";
import { createSqliteGoalRepository } from "../../src/features/goals/infrastructure/sqlite-goal-repository.js";
import { linhas } from "../helpers/banco.js";

let db: Client;
beforeEach(async () => { db = await abrirBanco(":memory:"); });
afterEach(() => db.close());

function prepararLegado() {
  // Reconstitui apenas o schema antigo de metas em um banco descartável de teste.
  return db.executeMultiple(`
    DROP TABLE aportes_metas;
    DROP TABLE metas;
    DELETE FROM migrations WHERE versao IN (6, 7);
    CREATE TABLE metas (
      id INTEGER PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE CHECK (length(trim(nome)) > 0),
      valor_alvo_em_centavos INTEGER NOT NULL CHECK (
        typeof(valor_alvo_em_centavos) = 'integer' AND
        valor_alvo_em_centavos BETWEEN 1 AND 9007199254740991
      )
    );
    INSERT INTO metas (id, nome, valor_alvo_em_centavos) VALUES
      (7, 'Viagem', 12345), (12, 'Reserva', 9007199254740991);
    INSERT INTO usuarios (id, nome, email, senha_hash) VALUES
      (1, 'Ana', 'ana@example.test', 'hash-teste'),
      (2, 'Bia', 'bia@example.test', 'hash-teste');
    INSERT INTO movimentacoes (id, usuario_id, descricao, tipo, valor_em_centavos, data)
      VALUES (1, 1, 'Salário', 'receita', 10000, '2026-10-01');
    INSERT INTO categorias (id, usuario_id, nome) VALUES (1, 1, 'Trabalho');
    INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES ('${"a".repeat(64)}', 1, 9999999999999);
  `);
}

describe("Migration 6 (metas por usuário)", () => {
  it("preserva IDs e dados antigos sem atribuir dono e não expõe metas legadas", async () => {
    await prepararLegado();
    const tables = ["usuarios", "movimentacoes", "categorias", "sessoes"];
    const conteudo = () => Promise.all(tables.map((table) => linhas(db, `SELECT * FROM ${table}`)));
    const before = await conteudo();
    await migrarBanco(db);
    expect(await linhas(db, "SELECT * FROM metas ORDER BY id")).toEqual([
      { id: 7, usuario_id: null, nome: "Viagem", valor_alvo_em_centavos: 12345 },
      { id: 12, usuario_id: null, nome: "Reserva", valor_alvo_em_centavos: Number.MAX_SAFE_INTEGER },
    ]);
    expect(await conteudo()).toEqual(before);
    for (const id of [1, 2]) {
      const repository = createSqliteGoalRepository(db, id);
      expect(await repository.list()).toEqual([]);
      expect(await repository.findByName("Viagem")).toBeNull();
      await repository.save({ name: "Viagem", targetAmountInCents: 100 });
    }
    const after = await linhas(db, "SELECT * FROM metas ORDER BY id");
    await migrarBanco(db);
    await migrarMetasPorUsuario(db);
    expect(await linhas(db, "SELECT * FROM metas ORDER BY id")).toEqual(after);
    expect(await linhas(db, "SELECT COUNT(*) AS total FROM migrations WHERE versao = 6")).toEqual([{ total: 1 }]);
    expect(await linhas(db, "PRAGMA foreign_key_check")).toEqual([]);
  });

  it("aplica a chave estrangeira e a unicidade por usuário também no libSQL", async () => {
    await prepararLegado();
    await migrarBanco(db);
    expect(await linhas(db, "PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);
    const insert = (usuarioId: number, nome: string, valor: number) => db.execute({
      sql: "INSERT INTO metas (usuario_id, nome, valor_alvo_em_centavos) VALUES (?, ?, ?)",
      args: [usuarioId, nome, valor],
    });
    await expect(insert(999, "Meta", 100)).rejects.toThrow(/FOREIGN KEY/);
    await insert(1, "Meta", 100);
    await insert(2, "Meta", 200);
    await expect(insert(1, "Meta", 300)).rejects.toThrow(/UNIQUE/);
    await expect(db.execute("DELETE FROM usuarios WHERE id = 2")).rejects.toThrow(/FOREIGN KEY/);
    expect(await linhas(db, "SELECT valor_alvo_em_centavos AS valor FROM metas WHERE usuario_id = 1 AND nome = 'Meta'"))
      .toEqual([{ valor: 100 }]);
  });

  it("reverte toda a migração em caso de erro e permite uma nova tentativa", async () => {
    await prepararLegado();
    const before = await linhas(db, "SELECT * FROM metas ORDER BY id");
    await db.execute(`CREATE TRIGGER falhar_migracao_6 BEFORE INSERT ON migrations
      WHEN NEW.versao = 6 BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;`);
    await expect(migrarMetasPorUsuario(db)).rejects.toThrow("falha simulada");
    expect(await linhas(db, "SELECT * FROM metas ORDER BY id")).toEqual(before);
    expect(await linhas(db, "SELECT versao FROM migrations WHERE versao = 6")).toEqual([]);
    expect(await linhas(db, "SELECT name FROM sqlite_master WHERE name = 'metas_novas'")).toEqual([]);
    await db.execute("DROP TRIGGER falhar_migracao_6");
    await migrarBanco(db);
    expect(await linhas(db, "SELECT id, nome, valor_alvo_em_centavos FROM metas ORDER BY id")).toEqual(before);
    expect(await linhas(db, "SELECT usuario_id FROM metas")).toEqual([{ usuario_id: null }, { usuario_id: null }]);
  });
});
