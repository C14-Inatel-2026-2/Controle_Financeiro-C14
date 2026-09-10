import type { InvoiceFile, InvoiceFormat } from "../../domain/invoice.js";
import { decodeInvoiceText } from "../extractors/csv/decode-invoice-text.js";
import { detectDelimiter } from "../extractors/csv/delimited-text.js";
import {
  InvalidInvoiceFileError,
  UnsupportedInvoiceFormatError,
} from "../../domain/invoice-errors.js";

/**
 * Identifica o formato de arquivos enviados para bancos conhecidos.
 *
 * A entrada manual não utiliza detecção porque já possui formato CSV definido.
 * A identificação considera o conteúdo antes da extensão para evitar que um
 * arquivo renomeado seja aceito como outro formato.
 */

export class InvoiceFormatDetector {
  detect(file: InvoiceFile): InvoiceFormat {
    if (file.content.length === 0) {
      throw new InvalidInvoiceFileError("O arquivo da fatura está vazio");
    }

    if (startsWithAscii(file.content, "%PDF-")) {
      return "pdf";
    }

    const text = decodeInvoiceText(file.content).text;

    if (looksLikeCsv(text)) {
      return "csv";
    }

    const declaredFormat = getDeclaredFormat(file);

    if (declaredFormat) {
      throw new InvalidInvoiceFileError(
        `O conteúdo não corresponde ao formato declarado: ${declaredFormat}`,
      );
    }

    throw new UnsupportedInvoiceFormatError(file.fileName);
  }
}

function startsWithAscii(content: Uint8Array, signature: string): boolean {
  if (content.length < signature.length) {
    return false;
  }

  return signature
    .split("")
    .every((character, index) => content[index] === character.charCodeAt(0));
}

function looksLikeCsv(content: string): boolean {
  try {
    detectDelimiter(content);
    return true;
  } catch {
    return false;
  }
}

function getDeclaredFormat(file: InvoiceFile): InvoiceFormat | undefined {
  const extension = file.fileName.toLowerCase().split(".").pop();
  const mimeType = file.mimeType?.toLowerCase();

  if (extension === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }

  if (
    extension === "csv" ||
    mimeType === "text/csv" ||
    mimeType === "application/csv"
  ) {
    return "csv";
  }

  return undefined;
}
