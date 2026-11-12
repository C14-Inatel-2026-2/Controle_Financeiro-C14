import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createAppComBanco } from "../../src/appComBanco.js";
import { abrirBanco } from "../../src/database/conexao.js";
import { createSqliteGoalRepository } from "../../src/features/goals/infrastructure/sqlite-goal-repository.js";

let db: DatabaseSync;
let directory: string;
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "c14-goals-auth-"));
  db = abrirBanco(join(directory, "financeiro.sqlite"));
});
afterEach(() => {
  if (db.isOpen) db.close();
  rmSync(directory, { recursive: true, force: true });
});

const goal = { name: "Viagem", targetAmountInCents: 12345 };

async function entrar(app: ReturnType<typeof createAppComBanco>, nome: string) {
  const email = `${nome.toLowerCase()}@example.test`;
  await request(app).post("/users").send({ nome, email, senha: "senha-de-teste" }).expect(201);
  const login = await request(app).post("/auth/login").send({ email, senha: "senha-de-teste" }).expect(200);
  return { id: login.body.id as number, cookie: login.headers["set-cookie"][0].split(";")[0] };
}

describe("Autenticação e isolamento das metas", () => {
  it.each(["/goals", "/api/goals"])("exige sessão em GET e POST %s", async (path) => {
    const app = createAppComBanco(db);
    for (const cookie of [undefined, "sessao=invalida"]) {
      const get = request(app).get(path);
      const post = request(app).post(path).send({ ...goal, usuarioId: 1 });
      if (cookie) {
        get.set("Cookie", cookie);
        post.set("Cookie", cookie);
      }
      for (const response of [await get, await post]) {
        expect(response.status).toBe(401);
        expect(response.body.erro.codigo).toBe("AUTHENTICATION_REQUIRED");
      }
    }
    expect(db.prepare("SELECT * FROM metas").all()).toEqual([]);
  });

  it.each(["expirada", "revogada"])("rejeita sessão %s sem gravar metas", async (estado) => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    if (estado === "expirada") db.exec("UPDATE sessoes SET expira_em = 0");
    else await request(app).post("/auth/logout").set("Cookie", ana.cookie).expect(204);
    await request(app).get("/goals").set("Cookie", ana.cookie).expect(401);
    await request(app).post("/goals").set("Cookie", ana.cookie).send(goal).expect(401);
    expect(db.prepare("SELECT * FROM metas").all()).toEqual([]);
  });

  it.each(["/goals", "/api/goals"])("preserva isolamento e duplicidade após reabrir o banco em %s", async (path) => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    const bia = await entrar(app, "Bia");
    await request(app).post(path).set("Cookie", ana.cookie).send(goal).expect(201);
    const biaGoal = { ...goal, targetAmountInCents: 500 };
    expect((await request(app).get(`${path}?usuarioId=${ana.id}&usuario_id=${ana.id}`)
      .set("Cookie", bia.cookie).set("X-User-Id", String(ana.id)).expect(200)).body).toEqual([]);
    expect(await createSqliteGoalRepository(db, bia.id).findByName(goal.name)).toBeNull();

    // O dono vem da sessão; o mesmo nome é permitido em outra conta.
    await request(app).post(path).set("Cookie", bia.cookie).send({
      ...biaGoal, usuarioId: ana.id, usuario_id: ana.id, usuario: { id: ana.id },
    }).expect(201);
    const duplicate = await request(app).post(path).set("Cookie", bia.cookie).send({ ...biaGoal, name: " Viagem " });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.erro.codigo).toBe("GOAL_ALREADY_EXISTS");

    db.close();
    db = abrirBanco(join(directory, "financeiro.sqlite"));
    const reopened = createAppComBanco(db);
    expect((await request(reopened).get(path).set("Cookie", ana.cookie).expect(200)).body)
      .toEqual([{ ...goal, progressAmountInCents: 0 }]);
    expect((await request(reopened).get(path).set("Cookie", bia.cookie).expect(200)).body)
      .toEqual([{ ...biaGoal, progressAmountInCents: 0 }]);
    await request(reopened).post(path).set("Cookie", ana.cookie).send(goal).expect(409);
  });

  it("não oferece edição ou exclusão que permitam alterar metas alheias", async () => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    const bia = await entrar(app, "Bia");
    await request(app).post("/goals").set("Cookie", ana.cookie).send(goal).expect(201);
    const id = db.prepare("SELECT id FROM metas WHERE usuario_id = ?").get(ana.id)!.id;
    for (const path of ["/goals", "/api/goals"]) {
      await request(app).put(`${path}/${id}`).set("Cookie", bia.cookie).send({ ...goal, targetAmountInCents: 1 }).expect(404);
      await request(app).patch(`${path}/${id}`).set("Cookie", bia.cookie).send({ ...goal, targetAmountInCents: 1 }).expect(404);
      await request(app).delete(`${path}/${id}`).set("Cookie", bia.cookie).expect(404);
    }
    expect(await createSqliteGoalRepository(db, ana.id).findByName(goal.name)).toEqual(goal);
    expect(await createSqliteGoalRepository(db, bia.id).list()).toEqual([]);
  });
});
