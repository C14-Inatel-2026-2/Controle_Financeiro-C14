import { describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { createInvoiceController } from "../../../src/controllers/createInvoiceController.js";
import { lerEntradaFatura, InvoiceRequestError } from "../../../src/controllers/lerEntradaFatura.js";
import { DuplicateInvoiceError } from "../../../src/features/invoice-import/domain/invoice-import-repository.js";
import { InvoiceParseError, InvoicePasswordRequiredError, UnsupportedBankError } from "../../../src/features/invoice-import/index.js";

function setup(identity?: (req: Request) => number | undefined) {
  const workflow = { preview: vi.fn(), confirm: vi.fn(), getOptions: vi.fn(), canConfirm: true };
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return { workflow, response, controller: createInvoiceController(workflow, identity) };
}
describe("Controller da importação com serviço simulado", () => {
  it("publica os formatos reais e a disponibilidade de confirmação", () => {
    const { controller, workflow, response } = setup();
    workflow.getOptions.mockReturnValue({ knownBanks: [{ id: "itau", formats: ["pdf"] }] });
    controller.options({} as Request, response);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      knownBanks: [{ id: "itau", formats: ["pdf"] }], confirmationAvailable: false,
    }));
  });
  it("responde erro genérico se a consulta do catálogo falhar", () => {
    const { controller, workflow, response } = setup();
    workflow.getOptions.mockImplementation(() => { throw new Error("detalhe interno"); });
    controller.options({} as Request, response);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("detalhe interno");
  });
  it("encaminha somente a fonte e responde 200", async () => {
    const { controller, workflow, response } = setup();
    workflow.preview.mockResolvedValue({ entries: [], totalInCents: 0 });
    await controller.preview({ body: { content: "CSV", entries: [{ valor: 999 }], usuarioId: 99 } }, response);
    expect(workflow.preview).toHaveBeenCalledExactlyOnceWith({ mode: "template", content: "CSV" });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ entries: [], totalInCents: 0 });
  });
  it.each([null, [], {}, { content: 10 }])("recusa estrutura inválida %j", async body => {
    const { controller, workflow, response } = setup();
    await controller.preview({ body }, response);
    expect(response.status).toHaveBeenCalledWith(400);
    expect(workflow.preview).not.toHaveBeenCalled();
  });
  it.each([
    [new InvoiceParseError("A fatura está vazia"), 422, "INVALID_INVOICE_DATA"],
    [new InvoicePasswordRequiredError(), 422, "PDF_PASSWORD_ERROR"],
    [new UnsupportedBankError("outro"), 415, "UNSUPPORTED_INVOICE"],
    [new Error("segredo interno"), 500, "INTERNAL_ERROR"],
  ])("traduz o erro %s em resposta HTTP", async (error, status, codigo) => {
    const { controller, workflow, response } = setup();
    workflow.preview.mockRejectedValue(error);
    await controller.preview({ body: { content: "" } }, response);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ erro: expect.objectContaining({ codigo }) });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("segredo interno");
  });
  it("bloqueia confirmação sem integração de autenticação", async () => {
    const { controller, workflow, response } = setup();
    await controller.confirm({ body: { usuarioId: 7 } } as Request, response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(workflow.confirm).not.toHaveBeenCalled();
  });
  it("recusa sessão ausente mesmo com usuarioId enviado no corpo", async () => {
    const { controller, workflow, response } = setup(() => undefined);
    await controller.confirm({ body: { usuarioId: 7 } } as Request, response);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(workflow.confirm).not.toHaveBeenCalled();
  });
  it("utiliza exclusivamente a identidade fornecida pelo servidor", async () => {
    const { controller, workflow, response } = setup(() => 7);
    workflow.confirm.mockResolvedValue({ importId: 1 });
    const fingerprint = "a".repeat(64);
    await controller.confirm({ body: { content: "CSV", fingerprint, usuarioId: 99 } } as Request, response);
    expect(workflow.confirm).toHaveBeenCalledExactlyOnceWith(7, { mode: "template", content: "CSV" }, fingerprint);
    expect(response.status).toHaveBeenCalledWith(201);
  });
  it("responde conflito para fatura duplicada", async () => {
    const { controller, workflow, response } = setup(() => 7);
    workflow.confirm.mockRejectedValue(new DuplicateInvoiceError());
    await controller.confirm({ body: { content: "CSV", fingerprint: "a".repeat(64) } } as Request, response);
    expect(response.status).toHaveBeenCalledWith(409);
  });
});
describe("Leitura do contrato HTTP sem mocks", () => {
  it("preserva CSV vazio para a validação de domínio", () => {
    expect(lerEntradaFatura({ content: "" })).toEqual({ mode: "template", content: "" });
  });
  it("decodifica PDF sem colocar a senha em outro campo", () => {
    const result = lerEntradaFatura({ mode: "known-bank", bankId: "itau", file: { fileName: "fatura.pdf", base64: "JVBERi0=", password: "senha-sintetica" } });
    expect(result.mode).toBe("known-bank");
    if (result.mode === "known-bank") {
      expect(Buffer.from(result.file.content).toString()).toBe("%PDF-");
      expect(Buffer.isBuffer(result.file.content)).toBe(false);
    }
  });
  it.each(["???", "JVBERi0", "data:application/pdf;base64,JVBERi0="])("rejeita base64 inválido %s", base64 => {
    expect(() => lerEntradaFatura({ mode: "known-bank", bankId: "itau", file: { fileName: "x.pdf", base64 } })).toThrow(InvoiceRequestError);
  });
  it("limita o tamanho do CSV", () => {
    expect(() => lerEntradaFatura({ content: "x".repeat(102401) })).toThrow("100 KiB");
  });
  it("aceita base64 canônico no limite de 5 MiB sem esgotar a pilha", () => {
    const size = 5 * 1024 * 1024;
    const result = lerEntradaFatura({ mode: "known-bank", bankId: "itau", file: {
      fileName: "sintetico.pdf", base64: Buffer.alloc(size).toString("base64"),
    } });
    if (result.mode !== "known-bank") throw new Error("Modo inesperado");
    expect(result.file.content.length).toBe(size);
  });
  it("rejeita PDF que ultrapassa o limite por um byte", () => {
    expect(() => lerEntradaFatura({ mode: "known-bank", bankId: "itau", file: {
      fileName: "sintetico.pdf", base64: Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64"),
    } })).toThrow(InvoiceRequestError);
  });
});
