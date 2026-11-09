import { describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createSqliteInvoiceImportRepository } from "../../../src/features/invoice-import/infrastructure/sqlite-invoice-import-repository.js";
import { DuplicateInvoiceError, type ImportPreview } from "../../../src/features/invoice-import/domain/invoice-import-repository.js";

const preview: ImportPreview = {
  source: { mode: "template", format: "csv", profileId: "standard-template-v1" },
  fingerprint: "a".repeat(64), ignoredNegativeCount: 0, totalInCents: 2000,
  entries: [
    { occurredOn: "2026-11-08", description: "Mercado", amountInCents: 1000 },
    { occurredOn: "2026-11-08", description: "Mercado", amountInCents: 1000 },
  ],
};
function setup() {
  const run = vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 12 });
  const link = vi.fn();
  const exec = vi.fn();
  const prepare = vi.fn().mockReturnValueOnce({ run }).mockReturnValueOnce({ run: link });
  const db = { prepare, exec } as unknown as DatabaseSync;
  const movements = { inserir: vi.fn().mockReturnValueOnce(21).mockReturnValueOnce(22) };
  return { run, link, exec, movements, repository: createSqliteInvoiceImportRepository(db, movements) };
}
describe("Persistência da importação com SQLite simulado", () => {
  it("grava a fatura e todas as compras, incluindo repetidas, antes do commit", () => {
    const { repository, run, link, exec, movements } = setup();
    expect(repository.save(7, preview)).toEqual({ importId: 12, importedCount: 2, totalInCents: 2000 });
    expect(run).toHaveBeenCalledExactlyOnceWith(7, preview.fingerprint, 2, 2000);
    expect(movements.inserir).toHaveBeenCalledTimes(2);
    expect(movements.inserir).toHaveBeenCalledWith(7, expect.objectContaining({ tipo: "despesa" }));
    expect(link.mock.calls).toEqual([[12, 21], [12, 22]]);
    expect(exec.mock.calls).toEqual([["BEGIN IMMEDIATE"], ["COMMIT"]]);
    expect(link.mock.invocationCallOrder[1]).toBeLessThan(exec.mock.invocationCallOrder[1]);
  });
  it("solicita rollback se o segundo lançamento falhar", () => {
    const { repository, exec, movements } = setup();
    movements.inserir.mockReset().mockReturnValueOnce(21).mockImplementationOnce(() => { throw new Error("falha de escrita"); });
    expect(() => repository.save(7, preview)).toThrow("falha de escrita");
    expect(exec.mock.calls).toEqual([["BEGIN IMMEDIATE"], ["ROLLBACK"]]);
  });
  it("não insere movimentações quando a chave única detecta repetição", () => {
    const { repository, run, exec, movements } = setup();
    run.mockReturnValue({ changes: 0, lastInsertRowid: 12 });
    expect(() => repository.save(7, preview)).toThrow(DuplicateInvoiceError);
    expect(movements.inserir).not.toHaveBeenCalled();
    expect(exec.mock.calls).toEqual([["BEGIN IMMEDIATE"], ["ROLLBACK"]]);
  });
  it("não executa rollback de outra transação quando BEGIN falha", () => {
    const { repository, run, exec } = setup();
    exec.mockImplementationOnce(() => { throw new Error("database is locked"); });
    expect(() => repository.save(7, preview)).toThrow("database is locked");
    expect(exec).toHaveBeenCalledTimes(1);
    expect(run).not.toHaveBeenCalled();
  });
});
