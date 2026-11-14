import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Client } from "@libsql/client";
import { abrirBanco, migrarBanco } from "../../src/database/conexao.js";
import { createAppComBanco } from "../../src/appComBanco.js";
import { criarRepositorioSessoes } from "../../src/repositories/sessoes.js";
import { linhas, removerPastaTemporaria } from "../helpers/banco.js";

let db: Client;
let pasta: string;
let ana: string;
let bia: string;
let id: number;
const caminho = () => join(pasta, "metas.sqlite");
const app = () => createAppComBanco(db);
beforeEach(async () => {
  pasta = mkdtempSync(join(tmpdir(), "c14-aportes-"));
  db = await abrirBanco(caminho());
  await db.executeMultiple(`INSERT INTO usuarios (id, nome, email, senha_hash) VALUES
    (1, 'Ana', 'ana@test.com', 'hash'), (2, 'Bia', 'bia@test.com', 'hash');`);
  const sessoes = criarRepositorioSessoes(db);
  ana = `sessao=${(await sessoes.criar(1)).token}`;
  bia = `sessao=${(await sessoes.criar(2)).token}`;
  const result = await request(app()).post("/api/goals").set("Cookie", ana).send({ name: "Viagem", targetAmountInCents: 100 }).expect(201);
  id = result.body.id;
});
afterEach(() => { db.close(); removerPastaTemporaria(pasta); });
const aportar = (amountInCents: unknown, cookie = ana, meta = id, prefixo = "/api") =>
  request(app()).post(`${prefixo}/goals/${meta}/contributions`).set("Cookie", cookie).send({ amountInCents, usuario_id: 2 });

describe("Aportes persistentes por usuário", () => {
  it("soma aportes, ultrapassa o alvo e preserva após reabrir sem alterar saldo", async () => {
    await aportar(75).expect(201);
    const result = await aportar(125, ana, id, "").expect(201);
    expect(result.body).toEqual({ id, name: "Viagem", targetAmountInCents: 100, progressAmountInCents: 200 });
    expect(await linhas(db, "SELECT * FROM movimentacoes")).toEqual([]);
    db.close(); db = await abrirBanco(caminho());
    const lista = await request(app()).get("/api/goals").set("Cookie", ana).expect(200);
    expect(lista.body).toEqual([result.body]);
    expect(await linhas(db, "SELECT usuario_id FROM aportes_metas")).toEqual([{ usuario_id: 1 }, { usuario_id: 1 }]);
  });
  it.each(["", "/api"])("exige sessão e não revela nem modifica metas alheias (%s)", async prefixo => {
    await request(app()).post(`${prefixo}/goals/${id}/contributions`).send({ amountInCents: 1 }).expect(401);
    await aportar(1, "sessao=invalida", id, prefixo).expect(401);
    const alheia = await aportar(1, bia, id, prefixo).expect(404);
    const ausente = await aportar(1, bia, 999, prefixo).expect(404);
    expect(alheia.body).toEqual(ausente.body);
    expect((await request(app()).get(`${prefixo}/goals`).set("Cookie", bia).expect(200)).body).toEqual([]);
    expect(await linhas(db, "SELECT * FROM aportes_metas")).toEqual([]);
  });
  it.each([0, -1, 0.5, "100", null, Number.MAX_SAFE_INTEGER + 1])("recusa aporte inválido %j sem gravar", async value => {
    await aportar(value).expect(400);
    expect(await linhas(db, "SELECT * FROM aportes_metas")).toEqual([]);
  });
  it.each(["abc", "0", "-1", "1.5", "9007199254740992"])("recusa ID inválido %s", async valor => {
    await request(app()).post(`/api/goals/${valor}/contributions`).set("Cookie", ana).send({ amountInCents: 1 }).expect(400);
  });
  it("limita a soma segura mesmo com requisições concorrentes", async () => {
    await aportar(Number.MAX_SAFE_INTEGER - 1).expect(201);
    const resultados = await Promise.all([aportar(1), aportar(1)]);
    expect(resultados.map(r => r.status).sort()).toEqual([201, 409]);
    expect(resultados.find(r => r.status === 409)!.body.erro.codigo).toBe("GOAL_PROGRESS_LIMIT");
    expect((await request(app()).get("/api/goals").set("Cookie", ana)).body[0].progressAmountInCents).toBe(Number.MAX_SAFE_INTEGER);
    expect(await linhas(db, "SELECT * FROM aportes_metas")).toHaveLength(2);
  });
  it("migration 7 preserva metas existentes, repete e protege propriedade e limite no banco", async () => {
    await db.executeMultiple("DROP TABLE aportes_metas; DROP INDEX metas_id_usuario; DELETE FROM migrations WHERE versao = 7;");
    const antes = await linhas(db, "SELECT * FROM metas");
    await migrarBanco(db); await migrarBanco(db);
    expect(await linhas(db, "SELECT * FROM metas")).toEqual(antes);
    const gravar = (usuario: number, valor: number) => db.execute({ sql: "INSERT INTO aportes_metas (meta_id, usuario_id, valor_em_centavos) VALUES (?, ?, ?)", args: [id, usuario, valor] });
    await expect(gravar(2, 1)).rejects.toThrow();
    await gravar(1, Number.MAX_SAFE_INTEGER);
    await expect(gravar(1, 1)).rejects.toThrow(/Limite/);
    expect(await linhas(db, "SELECT * FROM aportes_metas")).toHaveLength(1);
  });
  it("migration 7 faz rollback completo e pode ser repetida após a falha", async () => {
    await db.executeMultiple(`DROP TABLE aportes_metas; DROP INDEX metas_id_usuario;
      DELETE FROM migrations WHERE versao = 7;
      CREATE TRIGGER falhar_migration_7 BEFORE INSERT ON migrations
      WHEN NEW.versao = 7 BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;`);
    const antes = await linhas(db, "SELECT * FROM metas");
    await expect(migrarBanco(db)).rejects.toThrow("falha simulada");
    expect(await linhas(db, "SELECT * FROM metas")).toEqual(antes);
    expect(await linhas(db, "SELECT name FROM sqlite_master WHERE name IN ('aportes_metas', 'metas_id_usuario')")).toEqual([]);
    expect(await linhas(db, "SELECT versao FROM migrations WHERE versao = 7")).toEqual([]);
    await db.execute("DROP TRIGGER falhar_migration_7");
    await migrarBanco(db);
    await aportar(1).expect(201);
  });
  it("falha de gravação retorna 500 sem registrar aporte", async () => {
    await db.executeMultiple(`CREATE TRIGGER falhar_aporte BEFORE INSERT ON aportes_metas
      BEGIN SELECT RAISE(ABORT, 'falha simulada'); END;`);
    const resposta = await aportar(1).expect(500);
    expect(resposta.body.erro.codigo).toBe("INTERNAL_ERROR");
    expect(await linhas(db, "SELECT * FROM aportes_metas")).toEqual([]);
  });
  it("sessão revogada ou expirada não pode aportar", async () => {
    await db.execute("UPDATE sessoes SET expira_em = 0");
    await aportar(1).expect(401);
    await db.execute("DELETE FROM sessoes");
    await aportar(1).expect(401);
    expect(await linhas(db, "SELECT * FROM aportes_metas")).toEqual([]);
  });
});
