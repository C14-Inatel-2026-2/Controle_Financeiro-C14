import { describe, expect, it, vi } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { criarRepositorioMovimentacoes } from "../../src/repositories/movimentacoes";
import { validarValorEmCentavos } from "../../src/repositories/validarValorEmCentavos";

// Não abre SQLite: prepare, run e all são simulados nos dois primeiros testes.
describe("Repositório de movimentações — com mock", () => {
  it("insere a movimentação com o dono correto e retorna o ID gerado", () => {
    const run = vi.fn().mockReturnValue({ lastInsertRowid: 42n, changes: 1 });
    const prepare = vi.fn().mockReturnValue({ run });
    const db = { prepare } as unknown as DatabaseSync;
    const repositorio = criarRepositorioMovimentacoes(db);

    const id = repositorio.inserir(7, {
      descricao: "Mercado",
      tipo: "despesa",
      valorEmCentavos: 3000,
      data: "2026-09-30",
    });

    expect(prepare).toHaveBeenCalledTimes(1);
    const sql = prepare.mock.calls[0]![0] as string;
    expect(sql.replace(/\s+/g, " ").trim()).toBe(
      "INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data) VALUES (?, ?, ?, ?, ?)"
    );
    expect(run).toHaveBeenCalledExactlyOnceWith(7, "Mercado", "despesa", 3000, "2026-09-30");
    expect(id).toBe(42);
  });

  it("consulta pelo ID do usuário e devolve as movimentações retornadas", () => {
    const movimentos = [{ id: 42, descricao: "Mercado", tipo: "despesa", valorEmCentavos: 3000, data: "2026-09-30" }];
    const all = vi.fn().mockReturnValue(movimentos);
    const prepare = vi.fn().mockReturnValue({ all });
    const db = { prepare } as unknown as DatabaseSync;
    const repositorio = criarRepositorioMovimentacoes(db);

    expect(repositorio.listar(7)).toEqual(movimentos);
    expect(prepare).toHaveBeenCalledTimes(1);
    const sql = prepare.mock.calls[0]![0] as string;
    expect(sql.replace(/\s+/g, " ")).toContain("FROM movimentacoes WHERE usuario_id = ? ORDER BY data, id");
    expect(all).toHaveBeenCalledExactlyOnceWith(7);
  });
});

// Função real, sem mocks e sem abrir banco de dados.
describe("Validação de valores — sem mock", () => {
  it("aceita um valor inteiro positivo em centavos", () => {
    expect(() => validarValorEmCentavos(3000)).not.toThrow();
  });

  it("rejeita um valor negativo com a mensagem esperada", () => {
    expect(() => validarValorEmCentavos(-100)).toThrow(
      "O valor deve ser um inteiro não negativo em centavos."
    );
  });
});
