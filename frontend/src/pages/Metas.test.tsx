import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Metas } from "./Metas";
import { SessaoExpiradaError } from "../services/ServicoDeAutenticacao";

afterEach(cleanup);
const meta = { id: 7, name: "Viagem", targetAmountInCents: 10000, progressAmountInCents: 2500 };
const servicoFalso = (lista = [meta]) => ({ listar: vi.fn().mockResolvedValue(lista), criar: vi.fn(), aportar: vi.fn() });
function abrir(servico = servicoFalso(), aoSessaoExpirada = vi.fn()) {
  render(<Metas usuario={{ id: 1, nome: "Ana", email: "ana@test.com" }} aoSair={vi.fn()} aoNavegar={vi.fn()} {...{ servico, aoSessaoExpirada }} />);
}
function preencher(nome: string, valor: string) {
  fireEvent.change(screen.getByLabelText("Nome da meta"), { target: { value: nome } });
  fireEvent.change(screen.getByLabelText("Valor-alvo em reais"), { target: { value: valor } });
  fireEvent.click(screen.getByRole("button", { name: "Cadastrar meta" }));
}
function aportar(valor: string) {
  fireEvent.change(screen.getByLabelText("Meta"), { target: { value: "7" } });
  fireEvent.change(screen.getByLabelText("Valor do aporte em reais"), { target: { value: valor } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar aporte" }));
}

describe("Tela funcional de metas", () => {
  it("exibe o maior valor seguro sem perder o último centavo", async () => {
    abrir(servicoFalso([{ ...meta, targetAmountInCents: Number.MAX_SAFE_INTEGER, progressAmountInCents: Number.MAX_SAFE_INTEGER }]));
    await screen.findByRole("heading", { name: "Viagem" });
    expect(screen.getByText(/Valor-alvo:/).textContent).toContain("90.071.992.547.409,91");
    expect(screen.getByText(/Acumulado:/).textContent).toContain("90.071.992.547.409,91");
  });
  it("mostra carregamento, valores e progresso", async () => {
    abrir();
    expect(screen.getByRole("status").textContent).toBe("Carregando metas...");
    await screen.findByRole("heading", { name: "Viagem" });
    expect(screen.getByText(/Valor-alvo:/).textContent).toMatch(/100,00/);
    expect(screen.getByText(/Acumulado:/).textContent).toMatch(/25,00/);
    expect(screen.getByText("Conclusão: 25%")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("25");
  });
  it("cria meta a partir da lista vazia convertendo centavos", async () => {
    const servico = servicoFalso([]);
    servico.criar.mockResolvedValue({ ...meta, progressAmountInCents: 0 });
    abrir(servico);
    await screen.findByText("Nenhuma meta cadastrada.");
    preencher(" Viagem ", "100,00");
    expect(await screen.findByText("Meta cadastrada.")).toBeTruthy();
    expect(servico.criar).toHaveBeenCalledExactlyOnceWith("Viagem", 10000);
    expect(screen.getByRole("heading", { name: "Viagem" })).toBeTruthy();
    expect((screen.getByLabelText("Nome da meta") as HTMLInputElement).value).toBe("");
  });
  it("aporta e atualiza percentual real, limitando apenas a barra", async () => {
    const servico = servicoFalso();
    servico.aportar.mockResolvedValue({ ...meta, progressAmountInCents: 15000 });
    abrir(servico); await screen.findByRole("heading", { name: "Viagem" });
    aportar("125,00");
    await screen.findByText("Aporte registrado.");
    expect(servico.aportar).toHaveBeenCalledExactlyOnceWith(7, 12500);
    expect(screen.getByText("Conclusão: 150%")).toBeTruthy();
    expect((screen.getByRole("progressbar").firstElementChild as HTMLElement).style.width).toBe("100%");
  });
  it.each([["", "100"], ["Viagem", "0"], ["Viagem", "1,234"]])("valida campos antes de criar (%s, %s)", async (nome, valor) => {
    const servico = servicoFalso([]); abrir(servico); await screen.findByText("Nenhuma meta cadastrada.");
    preencher(nome, valor);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(servico.criar).not.toHaveBeenCalled();
  });
  it("exige seleção e valor válido para aportar", async () => {
    const servico = servicoFalso(); abrir(servico); await screen.findByRole("heading", { name: "Viagem" });
    fireEvent.change(screen.getByLabelText("Valor do aporte em reais"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar aporte" }));
    expect(screen.getByRole("alert").textContent).toBe("Selecione uma meta.");
    aportar("-1"); expect(servico.aportar).not.toHaveBeenCalled();
  });
  it("mantém campos e progresso quando a API recusa o aporte", async () => {
    const servico = servicoFalso(); servico.aportar.mockRejectedValue(new Error("Limite atingido"));
    abrir(servico); await screen.findByRole("heading", { name: "Viagem" }); aportar("5");
    expect((await screen.findByRole("alert")).textContent).toBe("Limite atingido");
    expect(screen.getByText("Conclusão: 25%")).toBeTruthy();
    expect((screen.getByLabelText("Valor do aporte em reais") as HTMLInputElement).value).toBe("5");
  });
  it("bloqueia envio repetido enquanto a operação está pendente", async () => {
    const servico = servicoFalso(); servico.aportar.mockReturnValue(new Promise(() => {}));
    abrir(servico); await screen.findByRole("heading", { name: "Viagem" }); aportar("5");
    const botao = screen.getByRole("button", { name: "Confirmar aporte" }) as HTMLButtonElement;
    fireEvent.submit(botao.closest("form")!); fireEvent.submit(botao.closest("form")!);
    expect(servico.aportar).toHaveBeenCalledTimes(1); expect(botao.disabled).toBe(true);
  });
  it("mostra falha de carregamento sem simular lista vazia", async () => {
    const servico = servicoFalso(); servico.listar.mockRejectedValue(new Error("Falha de rede")); abrir(servico);
    expect((await screen.findByRole("alert")).textContent).toBe("Falha de rede");
    expect(screen.queryByText("Nenhuma meta cadastrada.")).toBeNull();
  });
  it.each(["listar", "criar", "aportar"] as const)("trata sessão expirada ao %s", async operacao => {
    const servico = servicoFalso(); servico[operacao].mockRejectedValue(new SessaoExpiradaError());
    const expirada = vi.fn(); abrir(servico, expirada);
    if (operacao !== "listar") {
      await screen.findByRole("heading", { name: "Viagem" });
      if (operacao === "criar") preencher("Reserva", "10"); else aportar("1");
    }
    await waitFor(() => expect(expirada).toHaveBeenCalledTimes(1));
  });
});
