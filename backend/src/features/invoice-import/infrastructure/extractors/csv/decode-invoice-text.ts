/**
 * Utilitário de decodificação usado pelo extractor CSV manual.
 *
 * Converte bytes em texto e informa a codificação utilizada. Não participa do
 * fluxo de PDF.
 */

export interface DecodedInvoiceText {
  text: string;
  encoding: "utf-8" | "windows-1252";
}

export function decodeInvoiceText(content: Uint8Array): DecodedInvoiceText {
  try {
    // O modo fatal permite usar Windows-1252 somente quando o conteúdo não é
    // um UTF-8 válido.
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(content),
      encoding: "utf-8",
    };
  } catch {
    return {
      text: new TextDecoder("windows-1252").decode(content),
      encoding: "windows-1252",
    };
  }
}
