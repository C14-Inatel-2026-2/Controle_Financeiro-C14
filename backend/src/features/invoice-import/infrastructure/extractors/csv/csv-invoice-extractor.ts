import type { InvoiceFile } from "../../../domain/invoice.js";
import { decodeInvoiceText } from "./decode-invoice-text.js";
import { parseDelimitedText } from "./delimited-text.js";
import type {
  ExtractedCsvInvoiceData,
  InvoiceExtractor,
} from "../../../domain/invoice-extractor.js";

/**
 * Extractor da entrada CSV manual da opção "Outro banco".
 *
 * Converte os bytes em cabeçalho e linhas sem atribuir significado financeiro
 * às colunas. Essa interpretação permanece sob responsabilidade do profile.
 */

export class CsvInvoiceExtractor implements InvoiceExtractor {
  readonly format = "csv" as const;

  async extract(file: InvoiceFile): Promise<ExtractedCsvInvoiceData> {
    // Primeiro converte bytes em texto; depois separa as colunas e linhas.
    const decoded = decodeInvoiceText(file.content);

    return {
      format: "csv",
      encoding: decoded.encoding,
      ...parseDelimitedText(decoded.text),
    };
  }
}
