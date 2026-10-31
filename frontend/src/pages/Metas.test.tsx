import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Metas } from "./Metas";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const meta = { name: "Viagem", targetAmountInCents: 12345, progressAmountInCents: 0 };
function preencher() {
  fireEvent.change(screen.getByLabelText("Nome da meta"), { target: { value: "Viagem" } });
  fireEvent.change(screen.getByLabelText("Valor-alvo (R$)"), { target: { value: "123,45" } });
  fireEvent.click(screen.getByRole("button", { name: "Cadastrar meta" }));
}
async function vazio() {
  render(<Metas />);
  await screen.findByText("Nenhuma meta cadastrada.");
}

describe("Metas", () => {
  it("carrega as metas salvas com alvo e progresso zero", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([meta]))));
    render(<Metas />);
    await screen.findByText("Viagem");
    expect(screen.getByText(/Valor-alvo:.*123,45/)).toBeTruthy();
    expect(screen.getByText(/Progresso atual:.*0,00/)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("value")).toBe("0");
  });
  it("cadastra pela API e recarrega os dados ao reabrir a tela", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("[]"))
      .mockResolvedValueOnce(new Response(JSON.stringify(meta), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([meta])));
    vi.stubGlobal("fetch", fetchMock);
    await vazio();
    preencher();
    await screen.findByText("Meta cadastrada com sucesso.");
    expect(screen.getByText("Viagem")).toBeTruthy();
    cleanup();
    render(<Metas />);
    await screen.findByText("Viagem");
    expect(screen.queryByText("Meta cadastrada com sucesso.")).toBeNull();
  });
  it("mostra erro e permite repetir a consulta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("Sem rede"))
      .mockResolvedValueOnce(new Response("[]")));
    render(<Metas />);
    await screen.findByRole("alert");
    expect(screen.queryByText("Nenhuma meta cadastrada.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await screen.findByText("Nenhuma meta cadastrada.");
  });
  it.each([400, 409, 500])("nunca indica sucesso se o cadastro responde %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("[]"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ erro: { mensagem: "Cadastro falhou" } }), { status })));
    await vazio();
    preencher();
    expect((await screen.findByRole("alert")).textContent).toContain("Cadastro falhou");
    expect(screen.queryByText("Meta cadastrada com sucesso.")).toBeNull();
    expect(screen.queryByText("Viagem")).toBeNull();
    expect((screen.getByLabelText("Nome da meta") as HTMLInputElement).value).toBe("Viagem");
  });
  it("valida antes de chamar o cadastro na API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetchMock);
    await vazio();
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar meta" }));
    await screen.findByRole("alert");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("aguarda a confirmação da API antes de indicar sucesso e impede envio repetido", async () => {
    let confirmar!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("[]"))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => { confirmar = resolve; })));
    await vazio();
    preencher();
    expect(screen.queryByText("Meta cadastrada com sucesso.")).toBeNull();
    expect((screen.getByRole("button", { name: "Salvando…" }) as HTMLButtonElement).disabled).toBe(true);
    confirmar(new Response(JSON.stringify(meta), { status: 201 }));
    await waitFor(() => expect(screen.getByText("Meta cadastrada com sucesso.")).toBeTruthy());
  });
});
