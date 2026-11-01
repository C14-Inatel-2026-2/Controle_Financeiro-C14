import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { abrirBanco } from "../../src/database/conexao";
import { createSqliteGoalRepository } from "../../src/features/goals/infrastructure/sqlite-goal-repository";

const db = abrirBanco(":memory:");
const app = createApp({ goalCatalog: createSqliteGoalRepository(db) });
afterAll(() => db.close());

describe("GET /health", () => {
  it("retorna status 200 com status ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
