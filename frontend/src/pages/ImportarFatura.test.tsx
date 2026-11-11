import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImportarFatura } from "./ImportarFatura";
import type { OpcoesFatura, PreviaFatura } from "../services/ServicoDeImportacao";

afterEach(cleanup);
const options: OpcoesFatura = {
  knownBanks: [{ id: "itau", name: "Itaú", formats: ["pdf"] }],
  customTemplate: { example: "data;descricao;valor", aiUsageNotice: "Confira seus dados." },
  limits: { csvBytes: 102400, pdfBytes: 5242880 }, confirmationAvailable: true,
};
const preview: PreviaFatura = {
  entries: [{ occurredOn: "2026-11-08", description: "Mercado", amountInCents: 12590 }],
  totalInCents: 12590, ignoredNegativeCount: 1, fingerprint: "hash",
};
function setup(confirmationAvailable = true) {
  const api = {
    options: vi.fn().mockResolvedValue({ ...options, confirmationAvailable }),
    preview: vi.fn().mockResolvedValue(preview),
    confirm: vi.fn().mockResolvedValue({ importId: 1, importedCount: 1, totalInCents: 12590 }),
  };
  render(<ImportarFatura api={api} aoVoltar={vi.fn()} aoSessaoExpirada={vi.fn()} />);
  return api;
}
async function generate() {
  fireEvent.change(await screen.findByLabelText("Conteúdo CSV"), { target: { value: "CSV sintético" } });
  fireEvent.click(screen.getByRole("button", { name: "Gerar prévia" }));
  await screen.findByText("Mercado");
}
describe("Tela de importação com API simulada", () => {
  it("mostra a prévia sem confirmar automaticamente", async () => {
    const api = setup(); await generate();
    expect(api.preview).toHaveBeenCalledWith({ mode: "template", content: "CSV sintético" });
    expect(screen.getByText("1 lançamentos negativos descartados.")).toBeTruthy();
    expect(api.confirm).not.toHaveBeenCalled();
  });
  it("invalida a prévia quando o usuário altera a fonte", async () => {
    setup(); await generate();
    fireEvent.change(screen.getByLabelText("Conteúdo CSV"), { target: { value: "Outro CSV" } });
    expect(screen.queryByText("Mercado")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirmar importação" })).toBeNull();
  });
  it("envia o PDF e mantém a senha apenas na fonte transitória até confirmar", async () => {
    const api = setup();
    fireEvent.change(await screen.findByLabelText("Origem da fatura"), { target: { value: "itau" } });
    fireEvent.change(screen.getByLabelText("PDF Itaú compatível — até 5 MiB"), {
      target: { files: [new File(["%PDF-"], "sintetico.pdf", { type: "application/pdf" })] },
    });
    const password = screen.getByLabelText("Senha do PDF, se necessária") as HTMLInputElement;
    fireEvent.change(password, { target: { value: "somente-laboratorio" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar prévia" }));
    await screen.findByText("Mercado");
    expect(api.preview).toHaveBeenCalledWith({ mode: "known-bank", bankId: "itau", file: {
      fileName: "sintetico.pdf", mimeType: "application/pdf", base64: "JVBERi0=", password: "somente-laboratorio",
    } });
    expect(password.value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importação" }));
    await screen.findByText(/despesas registradas/);
    expect(api.confirm).toHaveBeenCalledWith(api.preview.mock.calls[0][0], "hash");
  });
  it("bloqueia confirmação enquanto a API não oferece essa capacidade", async () => {
    const api = setup(false); await generate();
    const button = screen.getByRole("button", { name: "Confirmar importação" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(api.confirm).not.toHaveBeenCalled();
  });
  it("confirma explicitamente e limpa a prévia após sucesso", async () => {
    const api = setup(); await generate();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importação" }));
    await screen.findByText(/despesas registradas/);
    expect(api.confirm).toHaveBeenCalledExactlyOnceWith({ mode: "template", content: "CSV sintético" }, "hash");
    expect(screen.queryByText("Mercado")).toBeNull();
  });
  it("exibe falha de prévia sem exibir sucesso", async () => {
    const api = setup(); api.preview.mockRejectedValue(new Error("A fatura está vazia"));
    fireEvent.click(await screen.findByRole("button", { name: "Gerar prévia" }));
    expect((await screen.findByRole("alert")).textContent).toContain("A fatura está vazia");
    expect(screen.queryByText(/despesas registradas/)).toBeNull();
  });
  it("mantém a prévia e informa falha de confirmação", async () => {
    const api = setup(); api.confirm.mockRejectedValue(new Error("Fatura duplicada"));
    await generate(); fireEvent.click(screen.getByRole("button", { name: "Confirmar importação" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Fatura duplicada");
    expect(screen.getByText("Mercado")).toBeTruthy();
  });
  it("permite tentar novamente a consulta de formatos", async () => {
    const api = setup(); api.options.mockRejectedValueOnce(new Error("offline"));
    // Nova montagem usa a falha preparada, sem depender de chamadas reais de rede.
    cleanup(); render(<ImportarFatura api={api} aoVoltar={vi.fn()} aoSessaoExpirada={vi.fn()} />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(screen.getByLabelText("Conteúdo CSV")).toBeTruthy());
  });
});
