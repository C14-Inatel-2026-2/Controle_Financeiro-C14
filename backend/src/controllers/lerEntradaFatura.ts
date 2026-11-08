import type { InvoiceImportRequest } from "../features/invoice-import/index.js";

export const INVOICE_LIMITS = { csvBytes: 100 * 1024, pdfBytes: 5 * 1024 * 1024 };
export class InvoiceRequestError extends Error {}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function lerEntradaFatura(body: unknown): InvoiceImportRequest {
  if (!isObject(body)) throw new InvoiceRequestError("Envie um objeto JSON.");
  if (body.mode === undefined || body.mode === "template") {
    if (typeof body.content !== "string") throw new InvoiceRequestError("content deve ser texto CSV.");
    if (Buffer.byteLength(body.content, "utf8") > INVOICE_LIMITS.csvBytes) {
      throw new InvoiceRequestError("O CSV excede o limite de 100 KiB.");
    }
    return { mode: "template", content: body.content };
  }
  if (body.mode !== "known-bank" || typeof body.bankId !== "string" || !isObject(body.file)) {
    throw new InvoiceRequestError("Informe mode, bankId e file válidos.");
  }
  const file = body.file;
  if (typeof file.fileName !== "string" || !file.fileName.trim() ||
      typeof file.base64 !== "string" || file.base64.length > Math.ceil(INVOICE_LIMITS.pdfBytes / 3) * 4 ||
      file.base64.length % 4 !== 0) {
    throw new InvoiceRequestError("Envie o nome e o conteúdo base64 de um PDF de até 5 MiB.");
  }
  if ((file.password !== undefined && typeof file.password !== "string") ||
      (file.mimeType !== undefined && typeof file.mimeType !== "string")) {
    throw new InvoiceRequestError("password e mimeType devem ser textos.");
  }
  const content = Buffer.from(file.base64, "base64");
  // O decoder do Node tolera caracteres inválidos; a comparação canônica os rejeita.
  // Não usamos regex com grupos repetidos: entradas grandes podem esgotar sua pilha.
  if (content.length > INVOICE_LIMITS.pdfBytes || content.toString("base64") !== file.base64) {
    throw new InvoiceRequestError("Conteúdo base64 inválido ou arquivo muito grande.");
  }
  return {
    mode: "known-bank", bankId: body.bankId,
    // PDF.js exige Uint8Array e rejeita Buffer, embora ambos sejam compatíveis no TypeScript.
    file: { fileName: file.fileName, content: new Uint8Array(content), mimeType: file.mimeType, password: file.password },
  };
}
