import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Client } from "@libsql/client";
import { abrirBanco } from "../../src/database/conexao.js";
import { createSqliteInvoiceImportRepository } from "../../src/features/invoice-import/infrastructure/sqlite-invoice-import-repository.js";
import { DuplicateInvoiceError, type ImportPreview } from "../../src/features/invoice-import/domain/invoice-import-repository.js";
import { linhas } from "../helpers/banco.js";

const preview: ImportPreview = {
  source: { mode: "template", format: "csv", profileId: "standard-template-v1" },
  fingerprint: "a".repeat(64), ignoredNegativeCount: 0, totalInCents: 2000,
  entries: [
    { occurredOn: "2026-11-08", description: "Mercado", amountInCents: 1000 },
    { occurredOn: "2026-11-08", description: "Mercado", amountInCents: 1000 },
  ],
};

// Banco libSQL em memória: o mesmo caminho de dados da aplicação, sem arquivo e sem rede.
let db: Client;
beforeEach(async () => {
  db = await abrirBanco(":memory:");
  await db.execute("INSERT INTO usuarios (id, nome, email, senha_hash) VALUES (7, 'Ana', 'ana@example.test', 'hash-teste')");
});
afterEach(() => db.close());

const contar = async (tabela: string) => (await linhas(db, `SELECT count(*) AS n FROM ${tabela}`))[0]!.n;

describe("Persistência da importação com libSQL", () => {
  it("grava a fatura e todas as compras, incluindo repetidas, vinculadas à importação", async () => {
    const recibo = await createSqliteInvoiceImportRepository(db).save(7, preview);
    expect(recibo).toEqual({ importId: 1, importedCount: 2, totalInCents: 2000 });
    expect(await linhas(db, "SELECT usuario_id, descricao, tipo, valor_em_centavos FROM movimentacoes")).toEqual([
      { usuario_id: 7, descricao: "Mercado", tipo: "despesa", valor_em_centavos: 1000 },
      { usuario_id: 7, descricao: "Mercado", tipo: "despesa", valor_em_centavos: 1000 },
    ]);
    expect(await linhas(db, "SELECT importacao_id, movimentacao_id FROM importacao_lancamentos ORDER BY movimentacao_id"))
      .toEqual([{ importacao_id: 1, movimentacao_id: 1 }, { importacao_id: 1, movimentacao_id: 2 }]);
  });

  it("desfaz tudo se o segundo lançamento falhar no banco", async () => {
    // Data inexistente: só a restrição CHECK da tabela recusa, depois do primeiro INSERT.
    const falha = { ...preview, entries: [preview.entries[0]!, { ...preview.entries[1]!, occurredOn: "2026-02-30" }] };
    await expect(createSqliteInvoiceImportRepository(db).save(7, falha)).rejects.toThrow();
    expect(await contar("importacoes_faturas")).toBe(0);
    expect(await contar("movimentacoes")).toBe(0);
    expect(await contar("importacao_lancamentos")).toBe(0);
  });

  it("não grava nada quando um lançamento é inválido antes de chegar ao banco", async () => {
    const invalida = { ...preview, entries: [preview.entries[0]!, { ...preview.entries[1]!, amountInCents: 1.5 }] };
    await expect(createSqliteInvoiceImportRepository(db).save(7, invalida)).rejects.toThrow();
    expect(await contar("importacoes_faturas")).toBe(0);
    expect(await contar("movimentacoes")).toBe(0);
  });

  it("recusa a mesma fatura repetida sem inserir movimentações", async () => {
    const repository = createSqliteInvoiceImportRepository(db);
    await repository.save(7, preview);
    await expect(repository.save(7, preview)).rejects.toThrow(DuplicateInvoiceError);
    expect(await contar("importacoes_faturas")).toBe(1);
    expect(await contar("movimentacoes")).toBe(2);
  });

  it("em duas confirmações simultâneas, só uma grava", async () => {
    const repository = createSqliteInvoiceImportRepository(db);
    const resultados = await Promise.allSettled([repository.save(7, preview), repository.save(7, preview)]);
    expect(resultados.map((r) => r.status).sort()).toEqual(["fulfilled", "rejected"]);
    const recusada = resultados.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(recusada.reason).toBeInstanceOf(DuplicateInvoiceError);
    expect(await contar("movimentacoes")).toBe(2);
  });
});
