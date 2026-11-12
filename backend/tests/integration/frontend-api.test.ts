import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "@libsql/client";
import { createAppComBanco } from "../../src/appComBanco.js";
import { abrirBanco } from "../../src/database/conexao.js";

let db: Client;
let pasta: string;
let frontend: string;
beforeEach(async () => {
  pasta = mkdtempSync(join(tmpdir(), "c14-frontend-"));
  frontend = join(pasta, "public");
  mkdirSync(join(frontend, "assets"), { recursive: true });
  writeFileSync(join(frontend, "index.html"), '<!doctype html><div id="root"></div>');
  writeFileSync(join(frontend, "assets", "app.js"), "console.log('ok');");
  writeFileSync(join(frontend, ".env"), "SEGREDO=nao-deve-sair");
  writeFileSync(join(pasta, "fora.txt"), "fora da pasta pública");
  db = await abrirBanco(":memory:");
});
afterEach(() => {
  db.close();
  rmSync(pasta, { recursive: true, force: true });
});

const app = () => createAppComBanco(db, { pastaFrontend: frontend });

describe("Frontend e API na mesma origem", () => {
  it("serve o index.html e os arquivos compilados", async () => {
    const inicio = await request(app()).get("/");
    expect(inicio.status).toBe(200);
    expect(inicio.headers["content-type"]).toContain("text/html");
    expect(inicio.text).toContain('<div id="root">');

    const script = await request(app()).get("/assets/app.js");
    expect(script.status).toBe(200);
    expect(script.headers["content-type"]).toContain("javascript");
  });

  it("mantém /health na raiz e também o responde em /api", async () => {
    for (const caminho of ["/health", "/api/health"]) {
      const resposta = await request(app()).get(caminho);
      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ status: "ok" });
    }
  });

  it("cadastra, entra e usa categorias pelo prefixo /api", async () => {
    const aplicacao = app();
    const dados = { nome: "Ana", email: "ana@example.test", senha: "senha-de-teste" };
    expect((await request(aplicacao).post("/api/users").send(dados)).status).toBe(201);
    expect((await request(aplicacao).post("/api/users").send(dados)).status).toBe(409);

    const login = await request(aplicacao).post("/api/auth/login").send({ email: dados.email, senha: dados.senha });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"][0].split(";")[0];

    expect((await request(aplicacao).post("/api/categories").set("Cookie", cookie).send({ name: "Lazer" })).status).toBe(201);
    const lista = await request(aplicacao).get("/api/categories").set("Cookie", cookie);
    expect(lista.body).toEqual([{ id: 1, name: "Lazer" }]);
    expect((await request(aplicacao).get("/api/categories")).status).toBe(401);
  });

  it("responde 404 em JSON para rota desconhecida da API, sem cair no frontend", async () => {
    for (const caminho of ["/api/nao-existe", "/api/index.html", "/api/assets/app.js"]) {
      const resposta = await request(app()).get(caminho);
      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual({ erro: { codigo: "NOT_FOUND", mensagem: "Rota da API não encontrada." } });
    }
    expect((await request(app()).post("/api/nao-existe").send({})).status).toBe(404);
  });

  it("não serve arquivos ocultos nem de fora da pasta pública", async () => {
    for (const caminho of ["/.env", "/../fora.txt", "/%2e%2e/fora.txt", "/assets/%2e%2e/%2e%2e/fora.txt", "/nao-existe.js"]) {
      const resposta = await request(app()).get(caminho);
      expect(resposta.status, caminho).not.toBe(200);
      expect(resposta.text, caminho).not.toContain("nao-deve-sair");
      expect(resposta.text, caminho).not.toContain("fora da pasta");
    }
  });

  it("sem pasta do frontend, a raiz continua respondendo como antes", async () => {
    const resposta = await request(createAppComBanco(db)).get("/");
    expect(resposta.text).toBe("api funcionando");
  });
});
