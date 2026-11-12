import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Dashboard } from "./Dashboard";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("mostra o mês e os valores zerados da conta vazia", async () => {
  const fetchResumo = vi.fn().mockResolvedValue(Response.json({
    mes: "2026-11", saldoEmCentavos: 0, receitasEmCentavos: 0, despesasEmCentavos: 0,
    gastosPorCategoria: [], ultimosLancamentos: [],
  }));
  vi.stubGlobal("fetch", fetchResumo);
  render(<Dashboard usuario={{ id: 1, nome: "Ana", email: "ana@example.test" }} aoNavegar={vi.fn()}
    aoSair={vi.fn()} aoSessaoExpirada={vi.fn()} />);
  expect(await screen.findByText("Nenhum lançamento registrado.")).toBeTruthy();
  expect(screen.getAllByText(/R\$\s*0,00/)).toHaveLength(3);
  expect(screen.getByText("novembro de 2026")).toBeTruthy();
  expect(fetchResumo.mock.calls[0][0]).toBe("/api/resumo");
  fetchResumo.mockResolvedValueOnce(Response.json({ mes: "2026-10", saldoEmCentavos: 0,
    receitasEmCentavos: 0, despesasEmCentavos: 0, gastosPorCategoria: [], ultimosLancamentos: [] }));
  fireEvent.change(screen.getByLabelText("Mês"), { target: { value: "2026-10" } });
  await waitFor(() => expect(fetchResumo.mock.calls.at(-1)?.[0]).toBe("/api/resumo?mes=2026-10"));
  expect(await screen.findByText("outubro de 2026")).toBeTruthy();
});
