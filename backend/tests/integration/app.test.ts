import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { DatabaseSync } from "node:sqlite";
import { app, createApp } from "../../src/app.js";
import type { CriarUsuario } from "../../src/controllers/createUserController.js";
import { abrirBanco } from "../../src/database/conexao.js";
import { createSqliteGoalRepository } from "../../src/features/goals/infrastructure/sqlite-goal-repository.js";
import { criarRepositorioSessoes } from "../../src/repositories/sessoes.js";
import { criarRepositorioCredenciais } from "../../src/repositories/credenciais.js";

let db: DatabaseSync;
beforeEach(() => { db = abrirBanco(":memory:"); });
afterEach(() => db.close());

const dadosUsuario = { nome: "Ana", email: "ana@example.test", senha: "senha-teste-123" };
const meta = { name: "Viagem", targetAmountInCents: 100000 };

describe("Montagem conjunta de metas e usuários", () => {
  it.each([true, false])("mantém metas e health com cadastro configurado: %s", async (configurado) => {
    const criarUsuario = vi.fn<CriarUsuario>().mockResolvedValue({
      id: 1, nome: dadosUsuario.nome, email: dadosUsuario.email,
    });
    db.prepare("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)")
      .run(1, dadosUsuario.nome, dadosUsuario.email, "hash-teste");
    const sessoes = criarRepositorioSessoes(db);
    const cookie = `sessao=${sessoes.criar(1).token}`;
    const application = createApp({
      metasDoUsuario: (usuarioId) => createSqliteGoalRepository(db, usuarioId),
      autenticacao: { credenciais: criarRepositorioCredenciais(db), sessoes, cookieSeguro: false },
      criarUsuario: configurado ? criarUsuario : undefined,
    });

    await request(application).get("/goals").expect(401);
    const cadastroMeta = await request(application).post("/goals").set("Cookie", cookie).send(meta);
    expect(cadastroMeta.status).toBe(201);
    expect(cadastroMeta.body).toEqual({ ...meta, progressAmountInCents: 0 });

    const cadastroUsuario = await request(application).post("/users").send(dadosUsuario);
    if (configurado) {
      expect(cadastroUsuario.status).toBe(201);
      expect(cadastroUsuario.body).toEqual({ id: 1, nome: dadosUsuario.nome, email: dadosUsuario.email });
      expect(criarUsuario).toHaveBeenCalledExactlyOnceWith(dadosUsuario);
    } else {
      expect(cadastroUsuario.status).toBe(503);
      expect(cadastroUsuario.body).toEqual({
        erro: {
          codigo: "USER_REGISTRATION_UNAVAILABLE",
          mensagem: "Cadastro de usuários indisponível.",
        },
      });
      expect(criarUsuario).not.toHaveBeenCalled();
    }

    const consulta = await request(application).get("/goals").set("Cookie", cookie);
    expect(consulta.status).toBe(200);
    expect(consulta.body).toEqual([cadastroMeta.body]);
    const health = await request(application).get("/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });
  });

  it("mantém a aplicação exportada sem dependências com health e cadastro indisponível", async () => {
    expect((await request(app).get("/health")).status).toBe(200);
    const cadastro = await request(app).post("/users").send(dadosUsuario);
    expect(cadastro.status).toBe(503);
    expect(cadastro.body.erro.codigo).toBe("USER_REGISTRATION_UNAVAILABLE");
  });
});
