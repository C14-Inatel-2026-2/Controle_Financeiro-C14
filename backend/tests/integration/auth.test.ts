import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { DatabaseSync } from "node:sqlite";
import { createAppComBanco } from "../../src/appComBanco.js";
import { createApp } from "../../src/app.js";
import { abrirBanco, migrarBanco } from "../../src/database/conexao.js";
import { criarRepositorioCredenciais } from "../../src/repositories/credenciais.js";
import { criarRepositorioSessoes, DURACAO_SESSAO_MS } from "../../src/repositories/sessoes.js";
import { criarRepositorioMovimentacoes } from "../../src/repositories/movimentacoes.js";

let db: DatabaseSync;
beforeEach(() => { db = abrirBanco(":memory:"); });
afterEach(() => db.close());

const ana = { nome: "Ana", email: "ana@example.test", senha: "senha-da-ana" };
const bia = { nome: "Bia", email: "bia@example.test", senha: "senha-da-bia" };
const fatura = { mode: "template", content: "data;descricao;valor\n2026-09-01;Supermercado;125,90\n2026-09-03;Farmácia;40,00" };

async function cadastrarEEntrar(app: ReturnType<typeof createAppComBanco>, dados: typeof ana) {
  await request(app).post("/users").send(dados).expect(201);
  const resposta = await request(app).post("/auth/login").send({ email: dados.email, senha: dados.senha });
  expect(resposta.status).toBe(200);
  return resposta.headers["set-cookie"][0].split(";")[0];
}

describe("POST /auth/login", () => {
  it("cria a sessão com cookie HttpOnly e não devolve o hash", async () => {
    const app = createAppComBanco(db);
    await request(app).post("/users").send(ana).expect(201);
    const resposta = await request(app).post("/auth/login").send({ email: "ANA@example.test", senha: ana.senha });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id: 1, nome: "Ana", email: "ana@example.test" });
    const cookie = resposta.headers["set-cookie"][0];
    expect(cookie).toMatch(/^sessao=[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Expires=");
    expect(cookie).not.toContain("Secure");

    const token = cookie.split(";")[0].split("=")[1];
    const sessoes = db.prepare("SELECT token_hash, usuario_id FROM sessoes").all();
    expect(sessoes).toEqual([{ token_hash: expect.stringMatching(/^[a-f0-9]{64}$/), usuario_id: 1 }]);
    expect(sessoes[0]!.token_hash).not.toBe(token);
  });

  it("marca o cookie como Secure quando configurado para produção", async () => {
    const app = createApp({
      criarUsuario: async () => ({ id: 1, nome: "Ana", email: ana.email }),
      autenticacao: { credenciais: criarRepositorioCredenciais(db), sessoes: criarRepositorioSessoes(db), cookieSeguro: true },
    });
    await request(createAppComBanco(db)).post("/users").send(ana).expect(201);
    const resposta = await request(app).post("/auth/login").send({ email: ana.email, senha: ana.senha });
    expect(resposta.headers["set-cookie"][0]).toContain("Secure");
  });

  it("responde 401 igual para senha errada e e-mail inexistente, sem criar sessão", async () => {
    const app = createAppComBanco(db);
    await request(app).post("/users").send(ana).expect(201);
    const senhaErrada = await request(app).post("/auth/login").send({ email: ana.email, senha: "senha-errada" });
    const inexistente = await request(app).post("/auth/login").send({ email: "nao@example.test", senha: ana.senha });

    for (const resposta of [senhaErrada, inexistente]) {
      expect(resposta.status).toBe(401);
      expect(resposta.body).toEqual({ erro: { codigo: "INVALID_CREDENTIALS", mensagem: "E-mail ou senha incorretos." } });
      expect(resposta.headers["set-cookie"]).toBeUndefined();
    }
    expect(db.prepare("SELECT * FROM sessoes").all()).toEqual([]);
  });

  it.each([{}, { email: ana.email }, { email: "", senha: "x" }, { email: ana.email, senha: 123 }])(
    "responde 400 para entrada inválida: %j", async (corpo) => {
      const resposta = await request(createAppComBanco(db)).post("/auth/login").send(corpo);
      expect(resposta.status).toBe(400);
      expect(resposta.body.erro.codigo).toBe("VALIDATION_ERROR");
    });
});

describe("Sessão nas rotas protegidas", () => {
  it("responde 401 sem cookie e com cookie inventado", async () => {
    const app = createAppComBanco(db);
    for (const cookie of [undefined, "sessao=token-inventado"]) {
      const chamada = request(app).get("/auth/me");
      const resposta = cookie ? await chamada.set("Cookie", cookie) : await chamada;
      expect(resposta.status).toBe(401);
      expect(resposta.body.erro.codigo).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("responde 401 quando a sessão expirou", async () => {
    const app = createAppComBanco(db);
    const cookie = await cadastrarEEntrar(app, ana);
    expect((await request(app).get("/auth/me").set("Cookie", cookie)).status).toBe(200);
    db.prepare("UPDATE sessoes SET expira_em = ?").run(Date.now() - 1);
    expect((await request(app).get("/auth/me").set("Cookie", cookie)).status).toBe(401);
  });

  it("o repositório expira a sessão no prazo definido", () => {
    db.prepare("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (1, 'Ana', 'ana@example.test', 'hash-teste')").run();
    let agora = 1_000;
    const sessoes = criarRepositorioSessoes(db, () => agora);
    const { token, expiraEm } = sessoes.criar(1);
    expect(expiraEm).toBe(1_000 + DURACAO_SESSAO_MS);
    agora = expiraEm - 1;
    expect(sessoes.buscarUsuarioId(token)).toBe(1);
    agora = expiraEm;
    expect(sessoes.buscarUsuarioId(token)).toBeUndefined();
  });

  it("logout invalida a sessão no servidor e limpa o cookie", async () => {
    const app = createAppComBanco(db);
    const cookie = await cadastrarEEntrar(app, ana);
    const saida = await request(app).post("/auth/logout").set("Cookie", cookie);

    expect(saida.status).toBe(204);
    expect(saida.headers["set-cookie"][0]).toMatch(/^sessao=;.*Expires=Thu, 01 Jan 1970/);
    expect(db.prepare("SELECT * FROM sessoes").all()).toEqual([]);
    // Reusar o cookie antigo não funciona mais, mesmo que o navegador não o apague.
    expect((await request(app).get("/auth/me").set("Cookie", cookie)).status).toBe(401);
    expect((await request(app).post("/auth/logout")).status).toBe(204);
  });

  it("cada cookie identifica somente a própria conta", async () => {
    const app = createAppComBanco(db);
    const cookieAna = await cadastrarEEntrar(app, ana);
    const cookieBia = await cadastrarEEntrar(app, bia);
    expect((await request(app).get("/auth/me").set("Cookie", cookieAna)).body).toEqual({ id: 1, nome: "Ana", email: ana.email });
    expect((await request(app).get("/auth/me").set("Cookie", cookieBia)).body).toEqual({ id: 2, nome: "Bia", email: bia.email });
  });
});

describe("Confirmação de fatura autenticada com SQLite", () => {
  it("grava os lançamentos para a conta da sessão e isola as contas", async () => {
    const app = createAppComBanco(db);
    const cookieAna = await cadastrarEEntrar(app, ana);
    const cookieBia = await cadastrarEEntrar(app, bia);

    const previa = await request(app).post("/invoice-imports/preview").send(fatura);
    expect(previa.status).toBe(200);
    const confirmar = { ...fatura, fingerprint: previa.body.fingerprint };

    const semSessao = await request(app).post("/invoice-imports/confirm").send(confirmar);
    expect(semSessao.status).toBe(401);
    expect(semSessao.body.erro.codigo).toBe("AUTHENTICATION_REQUIRED");

    // O usuarioId no corpo é ignorado: vale só a sessão.
    const daAna = await request(app).post("/invoice-imports/confirm").set("Cookie", cookieAna).send({ ...confirmar, usuarioId: 2 });
    expect(daAna.status).toBe(201);
    expect(daAna.body).toMatchObject({ importedCount: 2, totalInCents: 16590 });

    const movimentacoes = criarRepositorioMovimentacoes(db);
    expect(movimentacoes.listar(1)).toHaveLength(2);
    expect(movimentacoes.listar(2)).toEqual([]);

    const repetida = await request(app).post("/invoice-imports/confirm").set("Cookie", cookieAna).send(confirmar);
    expect(repetida.status).toBe(409);
    expect(repetida.body.erro.codigo).toBe("DUPLICATE_INVOICE");

    const daBia = await request(app).post("/invoice-imports/confirm").set("Cookie", cookieBia).send(confirmar);
    expect(daBia.status).toBe(201);
    expect(movimentacoes.listar(1)).toHaveLength(2);
    expect(movimentacoes.listar(2)).toHaveLength(2);
  });

  it("informa que a confirmação está disponível", async () => {
    const opcoes = await request(createAppComBanco(db)).get("/invoice-imports/options");
    expect(opcoes.body.confirmationAvailable).toBe(true);
  });
});

describe("Migration 4 (sessões)", () => {
  it("adiciona a tabela a um banco na versão 3 e preserva os registros", () => {
    db.exec(`DROP TABLE sessoes; DELETE FROM migrations WHERE versao = 4;
      INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (1, 'Ana', 'ana@example.test', 'hash-teste');
      INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data)
        VALUES (1, 'Salário', 'receita', 10000, '2026-10-01');`);
    migrarBanco(db);
    migrarBanco(db);
    expect(db.prepare("SELECT * FROM usuarios").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM movimentacoes").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM sessoes").all()).toEqual([]);
    expect(db.prepare("SELECT versao FROM migrations ORDER BY versao").all())
      .toEqual([{ versao: 1 }, { versao: 2 }, { versao: 3 }, { versao: 4 }]);
  });
});
