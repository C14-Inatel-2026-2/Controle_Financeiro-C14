import { expect, it } from "vitest";
import { mesAtual, resumir } from "../../src/services/resumo";

it("mantém o resumo vazio com valores zerados", () => {
  expect(resumir([], [], "2026-11")).toEqual({
    mes: "2026-11", saldoEmCentavos: 0, receitasEmCentavos: 0,
    despesasEmCentavos: 0, gastosPorCategoria: [], ultimosLancamentos: [],
  });
});

it("filtra os totais pelo mês sem limitar o saldo e os cinco últimos lançamentos", () => {
  const movimentos = Array.from({ length: 6 }, (_, indice) => ({
    id: indice + 1, descricao: "Receita", tipo: "receita" as const,
    valorEmCentavos: 100, categoriaId: null, data: "2026-10-31",
  }));
  const original = structuredClone(movimentos);
  const resumo = resumir(movimentos, [], "2026-11");
  expect(resumo.saldoEmCentavos).toBe(600);
  expect(resumo.receitasEmCentavos).toBe(0);
  expect(resumo.despesasEmCentavos).toBe(0);
  expect(resumo.gastosPorCategoria).toEqual([]);
  expect(resumo.ultimosLancamentos.map(m => m.id)).toEqual([6, 5, 4, 3, 2]);
  expect(movimentos).toEqual(original);
});

it("separa saldo acumulado, gastos do mês e últimos lançamentos", () => {
  const base = { descricao: "Compra", tipo: "despesa" as const, categoriaId: 3, valorEmCentavos: 1000 };
  const dados = resumir([
    { ...base, id: 1, data: "2026-10-31" },
    { ...base, id: 2, data: "2026-11-01" },
    { ...base, id: 3, data: "2026-11-01" },
    { ...base, id: 4, data: "2026-11-02", categoriaId: null },
  ], [{ id: 3, name: "Lazer" }], "2026-11");
  expect(dados.saldoEmCentavos).toBe(-4000);
  expect(dados.despesasEmCentavos).toBe(3000);
  expect(dados.gastosPorCategoria.map(g => [g.nome, g.valorEmCentavos])).toEqual([["Lazer", 2000], ["Sem categoria", 1000]]);
  expect(dados.ultimosLancamentos.map(m => m.id)).toEqual([4, 3, 2, 1]);
  expect(mesAtual(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
});
