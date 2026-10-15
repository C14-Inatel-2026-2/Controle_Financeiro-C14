import { afterEach, describe, expect, it } from "vitest";
import { abrirBanco, migrarBanco } from "../../src/database/conexao";
import { criarRepositorioMovimentacoes } from "../../src/repositories/movimentacoes";
import type { DatabaseSync } from "node:sqlite";

let db: DatabaseSync;
afterEach(() => db?.close());

function preparar() {
  db = abrirBanco(":memory:");
  // Hash fictício apenas para teste: autenticação será implementada separadamente.
  db.prepare("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)")
    .run(1, "Ana", "ana@example.test", "hash-teste");
  db.prepare("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (?, ?, ?, ?)")
    .run(2, "Bia", "bia@example.test", "hash-teste");
  return criarRepositorioMovimentacoes(db);
}

const movimento = { descricao: "Mercado", tipo: "despesa" as const, valorEmCentavos: 3000, data: "2026-09-10" };

describe("Banco de movimentações", () => {
  it("insere dados e isola as movimentações de cada usuário", () => {
    const repo = preparar();
    const id = repo.inserir(1, movimento);
    repo.inserir(2, { ...movimento, descricao: "Aluguel" });
    expect(repo.listar(1)).toEqual([{ id, ...movimento }]);
    expect(repo.listar(2)).toHaveLength(1);
    expect(repo.listar(99)).toEqual([]);
  });
  it("rejeita movimentação de usuário inexistente", () => {
    const repo = preparar();
    expect(() => repo.inserir(99, movimento)).toThrow();
  });
  it("mantém dados ao reaplicar a migration e impede email duplicado", () => {
    preparar();
    migrarBanco(db);
    expect(db.prepare("SELECT id FROM usuarios").all()).toHaveLength(2);
    expect(() => db.prepare("INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)")
      .run("Outra Ana", "ANA@example.test", "hash-teste")).toThrow();
  });
  it("rejeita centavos fracionados e datas inexistentes", () => {
    const repo = preparar();
    expect(() => repo.inserir(1, { ...movimento, valorEmCentavos: 1.5 })).toThrow();
    expect(() => repo.inserir(1, { ...movimento, data: "2026-02-30" })).toThrow();
  });
});
