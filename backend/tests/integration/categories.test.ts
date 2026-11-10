import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createAppComBanco } from "../../src/appComBanco.js";
import { abrirBanco, migrarBanco } from "../../src/database/conexao.js";
import { criarRepositorioMovimentacoes } from "../../src/repositories/movimentacoes.js";
import { ValidationError } from "../../src/errors/userErrors.js";

let db: DatabaseSync;
let pasta: string;
beforeEach(() => {
  pasta = mkdtempSync(join(tmpdir(), "c14-categorias-"));
  db = abrirBanco(join(pasta, "financeiro.sqlite"));
});
afterEach(() => {
  if (db.isOpen) db.close();
  rmSync(pasta, { recursive: true, force: true });
});

async function entrar(app: ReturnType<typeof createAppComBanco>, nome: string) {
  const email = `${nome.toLowerCase()}@example.test`;
  await request(app).post("/users").send({ nome, email, senha: "senha-de-teste" }).expect(201);
  const login = await request(app).post("/auth/login").send({ email, senha: "senha-de-teste" }).expect(200);
  return { id: login.body.id as number, cookie: login.headers["set-cookie"][0].split(";")[0] };
}

describe("API de categorias", () => {
  it("responde 401 sem sessão", async () => {
    const app = createAppComBanco(db);
    expect((await request(app).get("/categories")).status).toBe(401);
    expect((await request(app).post("/categories").send({ name: "Lazer" })).status).toBe(401);
    expect(db.prepare("SELECT * FROM categorias").all()).toEqual([]);
  });

  it("cria e lista as categorias do usuário, mesmo após reabrir o banco", async () => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    expect((await request(app).get("/categories").set("Cookie", ana.cookie)).body).toEqual([]);

    const criada = await request(app).post("/categories").set("Cookie", ana.cookie).send({ name: " Transporte " });
    expect(criada.status).toBe(201);
    expect(criada.body).toEqual({ id: 1, name: "Transporte" });
    await request(app).post("/categories").set("Cookie", ana.cookie).send({ name: "Alimentação" }).expect(201);

    db.close();
    db = abrirBanco(join(pasta, "financeiro.sqlite"));
    const lista = await request(createAppComBanco(db)).get("/categories").set("Cookie", ana.cookie);
    expect(lista.status).toBe(200);
    expect(lista.body).toEqual([{ id: 2, name: "Alimentação" }, { id: 1, name: "Transporte" }]);
  });

  it.each([{}, { name: "" }, { name: "   " }, { name: 123 }, { name: null }, { name: ["Lazer"] }])(
    "rejeita nome inválido sem gravar: %j", async (corpo) => {
      const app = createAppComBanco(db);
      const ana = await entrar(app, "Ana");
      const resposta = await request(app).post("/categories").set("Cookie", ana.cookie).send(corpo);
      expect(resposta.status).toBe(400);
      expect(resposta.body.erro.codigo).toBe("VALIDATION_ERROR");
      expect(db.prepare("SELECT * FROM categorias").all()).toEqual([]);
    });

  it("rejeita duplicidade para o mesmo usuário e permite o mesmo nome em outra conta", async () => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    const bia = await entrar(app, "Bia");
    await request(app).post("/categories").set("Cookie", ana.cookie).send({ name: "Lazer" }).expect(201);

    const repetida = await request(app).post("/categories").set("Cookie", ana.cookie).send({ name: " Lazer " });
    expect(repetida.status).toBe(409);
    expect(repetida.body.erro.codigo).toBe("CATEGORY_ALREADY_EXISTS");
    expect((await request(app).post("/categories").set("Cookie", bia.cookie).send({ name: "Lazer" })).status).toBe(201);
  });

  it("isola as categorias entre contas", async () => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    const bia = await entrar(app, "Bia");
    await request(app).post("/categories").set("Cookie", ana.cookie).send({ name: "Mercado" }).expect(201);
    // usuarioId no corpo é ignorado: o dono vem da sessão.
    await request(app).post("/categories").set("Cookie", bia.cookie).send({ name: "Saúde", usuarioId: ana.id }).expect(201);

    expect((await request(app).get("/categories").set("Cookie", ana.cookie)).body).toEqual([{ id: 1, name: "Mercado" }]);
    expect((await request(app).get("/categories").set("Cookie", bia.cookie)).body).toEqual([{ id: 2, name: "Saúde" }]);
  });

  it("responde 500 quando o banco falha", async () => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    db.exec("DROP TABLE categorias");
    const resposta = await request(app).get("/categories").set("Cookie", ana.cookie);
    expect(resposta.status).toBe(500);
    expect(resposta.body.erro.codigo).toBe("INTERNAL_ERROR");
  });
});

describe("Movimentação com categoria opcional", () => {
  function preparar() {
    db.exec(`INSERT INTO usuarios (id, nome, email, senha_hash) VALUES
      (1, 'Ana', 'ana@example.test', 'hash-teste'), (2, 'Bia', 'bia@example.test', 'hash-teste');
      INSERT INTO categorias (id, usuario_id, nome) VALUES (10, 1, 'Mercado'), (20, 2, 'Mercado');`);
    return criarRepositorioMovimentacoes(db);
  }
  const movimento = { descricao: "Feira", tipo: "despesa" as const, valorEmCentavos: 4500, data: "2026-11-01" };
  const categoriaGravada = (id: number) =>
    db.prepare("SELECT categoria_id FROM movimentacoes WHERE id = ?").get(id)?.categoria_id;

  it("grava com uma categoria válida do próprio usuário", () => {
    const repo = preparar();
    const id = repo.inserir(1, { ...movimento, categoriaId: 10 });
    expect(categoriaGravada(id)).toBe(10);
    expect(repo.listar(1)).toEqual([{ id, ...movimento, categoriaId: 10 }]);
  });

  it("grava sem categoria, com ou sem o campo", () => {
    const repo = preparar();
    expect(categoriaGravada(repo.inserir(1, movimento))).toBeNull();
    expect(categoriaGravada(repo.inserir(1, { ...movimento, categoriaId: null }))).toBeNull();
    expect(repo.listar(1).map((item) => item.categoriaId)).toEqual([null, null]);
  });

  it.each([
    ["inexistente", 99],
    ["de outra conta", 20],
  ])("rejeita categoria %s sem gravar", (_caso, categoriaId) => {
    const repo = preparar();
    expect(() => repo.inserir(1, { ...movimento, categoriaId })).toThrow("Categoria não encontrada.");
    expect(repo.listar(1)).toEqual([]);
  });

  it.each([0, -1, 1.5, "10"])("rejeita categoriaId que não é inteiro positivo: %j", (categoriaId) => {
    const repo = preparar();
    expect(() => repo.inserir(1, { ...movimento, categoriaId: categoriaId as number })).toThrow(ValidationError);
    expect(repo.listar(1)).toEqual([]);
  });
});

describe("Migration 5 (categorias)", () => {
  it("adiciona categorias a um banco na versão 4 e preserva os registros", () => {
    db.exec(`DROP INDEX movimentacoes_categoria; ALTER TABLE movimentacoes DROP COLUMN categoria_id;
      DROP TABLE categorias; DELETE FROM migrations WHERE versao = 5;
      INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (1, 'Ana', 'ana@example.test', 'hash-teste');
      INSERT INTO movimentacoes (id, usuario_id, descricao, tipo, valor_em_centavos, data)
        VALUES (1, 1, 'Salário', 'receita', 10000, '2026-10-01');
      INSERT INTO importacoes_faturas (id, usuario_id, fingerprint, quantidade, total_em_centavos)
        VALUES (1, 1, '${"a".repeat(64)}', 1, 10000);
      INSERT INTO importacao_lancamentos (importacao_id, movimentacao_id) VALUES (1, 1);`);
    migrarBanco(db);
    migrarBanco(db);

    expect(db.prepare("SELECT * FROM usuarios").all()).toHaveLength(1);
    expect(db.prepare("SELECT * FROM importacao_lancamentos").all()).toHaveLength(1);
    expect(db.prepare("SELECT id, descricao, categoria_id FROM movimentacoes").all())
      .toEqual([{ id: 1, descricao: "Salário", categoria_id: null }]);
    expect(db.prepare("SELECT * FROM categorias").all()).toEqual([]);
    expect(db.prepare("SELECT versao FROM migrations WHERE versao = 5").get()).toEqual({ versao: 5 });
  });

  it("a importação de fatura continua gravando lançamentos sem categoria", async () => {
    const app = createAppComBanco(db);
    const ana = await entrar(app, "Ana");
    const fatura = { mode: "template", content: "data;descricao;valor\n2026-09-01;Supermercado;125,90" };
    const previa = await request(app).post("/invoice-imports/preview").send(fatura).expect(200);
    await request(app).post("/invoice-imports/confirm").set("Cookie", ana.cookie)
      .send({ ...fatura, fingerprint: previa.body.fingerprint }).expect(201);
    expect(db.prepare("SELECT categoria_id FROM movimentacoes").all()).toEqual([{ categoria_id: null }]);
  });
});
