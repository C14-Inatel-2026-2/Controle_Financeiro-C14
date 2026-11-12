import { expect, it } from "vitest";
import { mesAtual, resumir } from "../../src/services/resumo";

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
