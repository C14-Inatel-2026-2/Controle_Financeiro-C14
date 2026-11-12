import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "@libsql/client";
import { createAppComBanco } from "../../src/appComBanco.js";
import { abrirBanco, migrarBanco } from "../../src/database/conexao";
import { createSqliteGoalRepository } from "../../src/features/goals/infrastructure/sqlite-goal-repository";
import { linhas, removerPastaTemporaria } from "../helpers/banco.js";

let db: Client;
let directory: string;
let usuarioId: number;
let cookie: string;
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "c14-goals-"));
  db = await abrirBanco(join(directory, "financeiro.sqlite"));
  const application = app();
  const email = "ana@example.test";
  await request(application).post("/users").send({ nome: "Ana", email, senha: "senha-de-teste" }).expect(201);
  const login = await request(application).post("/auth/login").send({ email, senha: "senha-de-teste" }).expect(200);
  usuarioId = login.body.id;
  cookie = login.headers["set-cookie"][0].split(";")[0];
});
afterEach(() => {
  if (!db.closed) db.close();
  removerPastaTemporaria(directory);
});
const goal = { name: "Viagem", targetAmountInCents: 12345 };
const app = () => createAppComBanco(db);

describe("API e banco libSQL de metas", () => {
  it("lista vazia; cadastra e consulta com progresso zero mesmo após reabrir o banco", async () => {
    expect((await request(app()).get("/goals").set("Cookie", cookie).expect(200)).body).toEqual([]);
    const response = await request(app()).post("/goals").set("Cookie", cookie).send({ ...goal, name: " Viagem " });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ...goal, progressAmountInCents: 0 });
    db.close();
    db = await abrirBanco(join(directory, "financeiro.sqlite"));
    const listing = await request(app()).get("/goals").set("Cookie", cookie);
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
    const response = await request(app()).post("/goals").set("Cookie", cookie).send(body);
    expect(response.status).toBe(400);
    expect(response.body.erro.codigo).toBe("VALIDATION_ERROR");
    expect(await createSqliteGoalRepository(db, usuarioId).list()).toEqual([]);
  });

  it("mantém a regra existente de duplicidade por nome normalizado e sensível a maiúsculas", async () => {
    await request(app()).post("/goals").set("Cookie", cookie).send(goal).expect(201);
    const duplicate = await request(app()).post("/goals").set("Cookie", cookie).send({ ...goal, name: " Viagem " });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.erro.codigo).toBe("GOAL_ALREADY_EXISTS");
    expect((await request(app()).post("/goals").set("Cookie", cookie).send({ ...goal, name: "viagem" })).status).toBe(201);
    expect(await createSqliteGoalRepository(db, usuarioId).list()).toHaveLength(2);
  });

  it("o repositório também impede gravações duplicadas", async () => {
    const repository = createSqliteGoalRepository(db, usuarioId);
    await repository.save(goal);
    await expect(repository.save(goal)).rejects.toThrow("já está cadastrada");
  });

  it("responde erro nas falhas de persistência e consulta", async () => {
    const application = app();
    // Mantém a sessão válida para alcançar os erros das rotas de metas.
    await db.execute("DROP TABLE metas");
    for (const response of [
      await request(application).post("/goals").set("Cookie", cookie).send(goal),
      await request(application).get("/goals").set("Cookie", cookie),
    ]) {
      expect(response.status).toBe(500);
      expect(response.body.erro.codigo).toBe("INTERNAL_ERROR");
    }
  });

  it("adiciona a migration 2 a um banco na versão 1 e preserva seus registros", async () => {
    await db.executeMultiple(`DROP TABLE metas; DELETE FROM migrations WHERE versao IN (2, 6);
      INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data)
        VALUES (1, 'Salário', 'receita', 10000, '2026-10-01');`);
    await migrarBanco(db);
    await migrarBanco(db);
    expect(await linhas(db, "SELECT * FROM usuarios")).toHaveLength(1);
    expect(await linhas(db, "SELECT * FROM movimentacoes")).toHaveLength(1);
    expect(await linhas(db, "SELECT * FROM metas")).toEqual([]);
    // Este cenário verifica a evolução das metas; migrations posteriores pertencem a outros módulos.
    expect(await linhas(db, "SELECT versao FROM migrations WHERE versao <= 2 ORDER BY versao"))
      .toEqual([{ versao: 1 }, { versao: 2 }]);
  });

  it("o banco rejeita alvos inválidos e nomes vazios mesmo sem passar pelo serviço", async () => {
    const inserir = (nome: string, valor: number) => db.execute({
      sql: "INSERT INTO metas (usuario_id, nome, valor_alvo_em_centavos) VALUES (?, ?, ?)",
      args: [usuarioId, nome, valor],
    });
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(inserir("Meta", value)).rejects.toThrow();
    }
    await expect(inserir(" ", 1)).rejects.toThrow();
  });
});
