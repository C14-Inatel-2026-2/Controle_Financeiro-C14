import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { abrirBanco } from "../../src/database/conexao";
import { createAppComBanco } from "../../src/appComBanco";
import { criarRepositorioSessoes } from "../../src/repositories/sessoes";

let db: DatabaseSync;
let app: ReturnType<typeof createAppComBanco>;
let cookie: string;
const movimento = { descricao: "Mercado", tipo: "despesa", valorEmCentavos: 1500, data: "2026-11-10" };

beforeEach(() => {
  db = abrirBanco(":memory:");
  db.exec(`
    INSERT INTO usuarios VALUES (1,'Ana','ana@example.test','hash'), (2,'Bia','bia@example.test','hash');
    INSERT INTO categorias VALUES (11,1,'Mercado'), (12,2,'Mercado');
  `);
  app = createAppComBanco(db);
  cookie = "sessao=" + criarRepositorioSessoes(db).criar(1).token;
});
afterEach(() => db.close());

// O frontend e a imagem Docker chamam /api; a raiz continua valendo por compatibilidade.
describe.each(["", "/api"])("movimentações em '%s/movimentacoes'", (prefixo) => {
  const rota = `${prefixo}/movimentacoes`;

  it("exige login para inserir ou listar", async () => {
    await request(app).post(rota).send(movimento).expect(401);
    await request(app).get(rota).expect(401);
  });

  it("salva com ou sem categoria e lista somente as movimentações da sessão", async () => {
    for (const campos of [{}, { categoriaId: null }, { categoriaId: 11 }]) {
      await request(app).post(rota).set("Cookie", cookie)
        .send({ ...movimento, usuarioId: 2, ...campos }).expect(201);
    }
    const lista = await request(app).get(rota).set("Cookie", cookie).expect(200);
    expect(lista.body.map((m: { categoriaId: number | null }) => m.categoriaId)).toEqual([null, null, 11]);
    const outraSessao = criarRepositorioSessoes(db).criar(2);
    await request(app).get(rota).set("Cookie", "sessao=" + outraSessao.token).expect(200, []);
  });

  it("rejeita categoria alheia ou inexistente sem gravar a movimentação", async () => {
    for (const categoriaId of [12, 999]) {
      await request(app).post(rota).set("Cookie", cookie)
        .send({ ...movimento, categoriaId }).expect(404);
    }
    await request(app).get(rota).set("Cookie", cookie).expect(200, []);
  });
});
