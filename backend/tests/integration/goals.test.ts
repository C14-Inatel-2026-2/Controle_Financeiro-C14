import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createApp } from "../../src/app";
import { abrirBanco, migrarBanco } from "../../src/database/conexao";
import { createSqliteGoalRepository } from "../../src/features/goals/infrastructure/sqlite-goal-repository";

let db: DatabaseSync;
let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "c14-goals-"));
  db = abrirBanco(join(directory, "financeiro.sqlite"));
});
afterEach(() => {
  if (db.isOpen) db.close();
  rmSync(directory, { recursive: true, force: true });
});
const goal = { name: "Viagem", targetAmountInCents: 12345 };
const app = () => createApp({ goalCatalog: createSqliteGoalRepository(db) });

describe("API e SQLite de metas", () => {
  it("lista vazia; cadastra e consulta com progresso zero mesmo após reabrir o banco", async () => {
    expect((await request(app()).get("/goals")).body).toEqual([]);
    const response = await request(app()).post("/goals").send({ ...goal, name: " Viagem " });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ...goal, progressAmountInCents: 0 });
    db.close();
    db = abrirBanco(join(directory, "financeiro.sqlite"));
    const listing = await request(app()).get("/goals");
    expect(listing.status).toBe(200);
    expect(listing.body).toEqual([response.body]);
  });

  it.each([
    {}, null, { ...goal, name: " " }, { ...goal, name: 123 },
    { ...goal, name: [] }, { ...goal, name: {} },
    { ...goal, targetAmountInCents: 0 }, { ...goal, targetAmountInCents: -1 },
    { ...goal, targetAmountInCents: 1.5 }, { ...goal, targetAmountInCents: "100" },
    { ...goal, targetAmountInCents: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejeita dados inválidos sem persistir: %j", async (body) => {
    const response = await request(app()).post("/goals").send(body);
    expect(response.status).toBe(400);
    expect(response.body.erro.codigo).toBe("VALIDATION_ERROR");
    expect(await createSqliteGoalRepository(db).list()).toEqual([]);
  });

  it("mantém a regra existente de duplicidade por nome normalizado e sensível a maiúsculas", async () => {
    await request(app()).post("/goals").send(goal);
    expect((await request(app()).post("/goals").send({ ...goal, name: " Viagem " })).status).toBe(409);
    expect((await request(app()).post("/goals").send({ ...goal, name: "viagem" })).status).toBe(201);
    expect(await createSqliteGoalRepository(db).list()).toHaveLength(2);
  });

  it("o repositório também impede gravações duplicadas", async () => {
    const repository = createSqliteGoalRepository(db);
    await repository.save(goal);
    await expect(repository.save(goal)).rejects.toThrow("já está cadastrada");
  });

  it("responde erro nas falhas de persistência e consulta", async () => {
    const application = app();
    db.close();
    for (const response of [
      await request(application).post("/goals").send(goal),
      await request(application).get("/goals"),
    ]) {
      expect(response.status).toBe(500);
      expect(response.body.erro.codigo).toBe("INTERNAL_ERROR");
    }
  });

  it("adiciona a migration 2 a um banco na versão 1 e preserva seus registros", () => {
    db.exec(`DROP TABLE metas; DELETE FROM migrations WHERE versao = 2;
      INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (1, 'Ana', 'ana@example.test', 'hash-teste');
      INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data)
        VALUES (1, 'Salário', 'receita', 10000, '2026-10-01');`);
    migrarBanco(db);
    migrarBanco(db);
    expect(db.prepare("SELECT * FROM usuarios").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM movimentacoes").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM metas").all()).toEqual([]);
    expect(db.prepare("SELECT versao FROM migrations ORDER BY versao").all()).toEqual([{ versao: 1 }, { versao: 2 }]);
  });

  it("o SQLite rejeita alvos inválidos e nomes vazios mesmo sem passar pelo serviço", () => {
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => db.prepare("INSERT INTO metas (nome, valor_alvo_em_centavos) VALUES (?, ?)").run("Meta", value)).toThrow();
    }
    expect(() => db.prepare("INSERT INTO metas (nome, valor_alvo_em_centavos) VALUES (?, ?)").run(" ", 1)).toThrow();
  });
});
