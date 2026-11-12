import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceFile } from "../../../src/features/invoice-import/domain/invoice.js";
import {
  InvalidInvoicePasswordError,
  InvoicePasswordRequiredError,
} from "../../../src/features/invoice-import/domain/invoice-errors.js";
import { PdfInvoiceExtractor } from "../../../src/features/invoice-import/infrastructure/extractors/pdf/pdf-invoice-extractor.js";

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));

// O PDF.js é simulado para testar o extractor; a descriptografia real é verificada com o PDF sintético.
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  getDocument,
  PasswordResponses: { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 },
}));

const file: InvoiceFile = {
  fileName: "fatura-sintetica.pdf",
  content: new TextEncoder().encode("%PDF-conteudo-simulado"),
  password: "senha-exclusiva-de-teste",
};

function setup() {
  const page = {
    getViewport: vi.fn().mockReturnValue({ width: 595, height: 842 }),
    getTextContent: vi.fn().mockResolvedValue({
      items: [
        { str: "MERCADO EXEMPLO", transform: [1, 0, 0, 1, 40, 700], width: 120, height: 10 },
      ],
    }),
    cleanup: vi.fn(),
  };
  const document = { numPages: 1, getPage: vi.fn().mockResolvedValue(page) };
  const loadingTask = {
    promise: Promise.resolve(document),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
  getDocument.mockReturnValue(loadingTask);
  return { loadingTask, extractor: new PdfInvoiceExtractor() };
}

beforeEach(() => { vi.resetAllMocks(); });

describe("PdfInvoiceExtractor com PDF.js simulado", () => {
  it("encaminha a senha correta e retorna o texto extraído", async () => {
    const { extractor, loadingTask } = setup();

    const result = await extractor.extract(file);

    expect(getDocument).toHaveBeenCalledExactlyOnceWith({
      data: file.content,
      password: file.password,
    });
    expect(result).toEqual({
      format: "pdf",
      pages: [{
        pageNumber: 1,
        width: 595,
        height: 842,
        items: [{ text: "MERCADO EXEMPLO", x: 40, y: 700, width: 120, height: 10 }],
      }],
    });
    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
  });

  it("informa que a senha é necessária quando ela não foi enviada", async () => {
    const { extractor, loadingTask } = setup();
    loadingTask.promise = Promise.reject({ name: "PasswordException", code: 1 });

    await expect(extractor.extract({ ...file, password: undefined }))
      .rejects.toBeInstanceOf(InvoicePasswordRequiredError);

    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
  });

  it("informa que a senha enviada está incorreta", async () => {
    const { extractor, loadingTask } = setup();
    loadingTask.promise = Promise.reject({ name: "PasswordException", code: 2 });

    await expect(extractor.extract({ ...file, password: "senha-incorreta-de-teste" }))
      .rejects.toBeInstanceOf(InvalidInvoicePasswordError);

    expect(loadingTask.destroy).toHaveBeenCalledTimes(1);
  });
});
