import { afterEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { abrirBanco, migrarBanco } from "../../src/database/conexao";
import { criarRepositorioMovimentacoes } from "../../src/repositories/movimentacoes";
import { linhas } from "../helpers/banco";

let db: Client;
afterEach(() => db?.close());

async function preparar() {
  db = await abrirBanco(":memory:");
  // Hash fictício apenas para teste.
  await db.execute({ sql: "INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)", args: [1, "Ana", "ana@example.test", "hash-teste"] });
  await db.execute({ sql: "INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)", args: [2, "Bia", "bia@example.test", "hash-teste"] });
  return criarRepositorioMovimentacoes(db);
}

const movimento = { descricao: "Mercado", tipo: "despesa" as const, valorEmCentavos: 3000, data: "2026-09-10" };

describe("Banco de movimentações", () => {
  it("cria o esquema completo num banco novo", async () => {
    db = await abrirBanco(":memory:");
    expect(await linhas(db, "SELECT versao FROM migrations ORDER BY versao"))
      .toEqual([1, 2, 3, 4, 5, 6, 7].map((versao) => ({ versao })));
    const tabelas = await linhas(db, "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    expect(tabelas.map((t) => t.name)).toEqual([
      "aportes_metas", "categorias", "importacao_lancamentos", "importacoes_faturas", "metas", "migrations", "movimentacoes", "sessoes", "usuarios",
    ]);
  });
  it("insere dados e isola as movimentações de cada usuário", async () => {
    const repo = await preparar();
    const id = await repo.inserir(1, movimento);
    await repo.inserir(2, { ...movimento, descricao: "Aluguel" });
    expect(await repo.listar(1)).toEqual([{ id, ...movimento, categoriaId: null }]);
    expect(await repo.listar(2)).toHaveLength(1);
    expect(await repo.listar(99)).toEqual([]);
  });
  it("rejeita movimentação de usuário inexistente", async () => {
    const repo = await preparar();
    await expect(repo.inserir(99, movimento)).rejects.toThrow();
  });
  it("mantém dados ao reaplicar a migration e impede email duplicado", async () => {
    await preparar();
    await migrarBanco(db);
    expect(await linhas(db, "SELECT id FROM usuarios")).toHaveLength(2);
    await expect(db.execute({
      sql: "INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)",
      args: ["Outra Ana", "ANA@example.test", "hash-teste"],
    })).rejects.toThrow();
  });
  it("rejeita centavos fracionados e datas inexistentes", async () => {
    const repo = await preparar();
    await expect(repo.inserir(1, { ...movimento, valorEmCentavos: 1.5 })).rejects.toThrow();
    await expect(repo.inserir(1, { ...movimento, data: "2026-02-30" })).rejects.toThrow();
  });
});
