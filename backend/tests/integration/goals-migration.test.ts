import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { abrirBanco, migrarBanco } from "../../src/database/conexao.js";
import { migrarMetasPorUsuario } from "../../src/database/migrarMetasPorUsuario.js";
import { createSqliteGoalRepository } from "../../src/features/goals/infrastructure/sqlite-goal-repository.js";

let db: DatabaseSync;
beforeEach(() => { db = abrirBanco(":memory:"); });
afterEach(() => db.close());

function prepararLegado() {
  // Reconstitui apenas o schema antigo de metas em um banco descartável de teste.
  db.exec(`
    DROP TABLE metas;
    DELETE FROM migrations WHERE versao = 6;
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
    prepararLegado();
    const tables = ["usuarios", "movimentacoes", "categorias", "sessoes"];
    const before = tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all());
    migrarBanco(db);
    expect(db.prepare("SELECT * FROM metas ORDER BY id").all()).toEqual([
      { id: 7, usuario_id: null, nome: "Viagem", valor_alvo_em_centavos: 12345 },
      { id: 12, usuario_id: null, nome: "Reserva", valor_alvo_em_centavos: Number.MAX_SAFE_INTEGER },
    ]);
    expect(tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all())).toEqual(before);
    for (const id of [1, 2]) {
      const repository = createSqliteGoalRepository(db, id);
      expect(await repository.list()).toEqual([]);
      expect(await repository.findByName("Viagem")).toBeNull();
      await repository.save({ name: "Viagem", targetAmountInCents: 100 });
    }
    const after = db.prepare("SELECT * FROM metas ORDER BY id").all();
    migrarBanco(db);
    migrarMetasPorUsuario(db);
    expect(db.prepare("SELECT * FROM metas ORDER BY id").all()).toEqual(after);
    expect(db.prepare("SELECT COUNT(*) AS total FROM migrations WHERE versao = 6").get()).toEqual({ total: 1 });
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("aplica a chave estrangeira e a unicidade por usuário também no SQLite", () => {
    prepararLegado();
    migrarBanco(db);
    expect(db.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
    const insert = db.prepare("INSERT INTO metas (usuario_id, nome, valor_alvo_em_centavos) VALUES (?, ?, ?)");
    expect(() => insert.run(999, "Meta", 100)).toThrow(/FOREIGN KEY/);
    insert.run(1, "Meta", 100);
    insert.run(2, "Meta", 200);
    expect(() => insert.run(1, "Meta", 300)).toThrow(/UNIQUE/);
    expect(() => db.prepare("DELETE FROM usuarios WHERE id = 2").run()).toThrow(/FOREIGN KEY/);
    expect(db.prepare("SELECT valor_alvo_em_centavos AS valor FROM metas WHERE usuario_id = 1 AND nome = 'Meta'").get())
      .toEqual({ valor: 100 });
  });

  it("reverte toda a migração em caso de erro e permite uma nova tentativa", () => {
    prepararLegado();
    const before = db.prepare("SELECT * FROM metas ORDER BY id").all();
    db.exec(`CREATE TRIGGER falhar_migracao_6 BEFORE INSERT ON migrations
      WHEN NEW.versao = 6 BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;`);
    expect(() => migrarMetasPorUsuario(db)).toThrow("falha simulada");
    expect(db.prepare("SELECT * FROM metas ORDER BY id").all()).toEqual(before);
    expect(db.prepare("SELECT versao FROM migrations WHERE versao = 6").get()).toBeUndefined();
    expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'metas_novas'").get()).toBeUndefined();
    db.exec("DROP TRIGGER falhar_migracao_6");
    migrarBanco(db);
    expect(db.prepare("SELECT id, nome, valor_alvo_em_centavos FROM metas ORDER BY id").all()).toEqual(before);
    expect(db.prepare("SELECT usuario_id FROM metas").all()).toEqual([{ usuario_id: null }, { usuario_id: null }]);
  });
});
