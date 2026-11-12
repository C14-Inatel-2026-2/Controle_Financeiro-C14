import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Movimentacoes } from "./Movimentacoes";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("carrega o histórico e salva uma despesa em reais com a categoria escolhida", async () => {
  const api = vi.fn(async (url: string, opcoes?: RequestInit) => {
    if (opcoes?.method === "POST") return Response.json({ id: 9 }, { status: 201 });
    if (url.endsWith("/categories")) return Response.json([{ id: 3, name: "Mercado" }]);
    return Response.json([]);
  });
  vi.stubGlobal("fetch", api);
  render(<Movimentacoes usuario={{ id: 1, nome: "Ana", email: "ana@example.test" }}
    aoNavegar={vi.fn()} aoSair={vi.fn()} aoSessaoExpirada={vi.fn()} />);
  await screen.findByText("Nenhum lançamento registrado.");
  fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Compras" } });
  fireEvent.change(screen.getByLabelText("Valor em reais"), { target: { value: "25,50" } });
  fireEvent.change(screen.getByLabelText("Categoria"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar lançamento" }));
  expect(await screen.findByText("Compras")).toBeTruthy();
  const chamada = api.mock.calls.find(([, opcoes]) => opcoes?.method === "POST");
  expect(JSON.parse(String(chamada?.[1]?.body))).toMatchObject({ tipo: "despesa", categoriaId: 3, valorEmCentavos: 2550 });
});
