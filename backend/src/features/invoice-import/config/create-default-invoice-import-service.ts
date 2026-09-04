import { CsvInvoiceExtractor } from "../infrastructure/extractors/csv/csv-invoice-extractor.js";
import {
  createInvoiceImportService,
  type InvoiceImportService,
} from "../application/invoice-import-service.js";
import { KNOWN_INVOICE_PROFILES } from "./known-invoice-profiles.js";
import { PdfInvoiceExtractor } from "../infrastructure/extractors/pdf/pdf-invoice-extractor.js";

/**
 * Montagem das dependências utilizadas em produção.
 *
 * O extractor CSV atende a entrada manual; o extractor PDF atende os bancos
 * conhecidos. O catálogo contém apenas os profiles liberados pela aplicação.
 * Camadas externas acessam esta factory por meio do `index.ts` da feature.
 */

export function createDefaultInvoiceImportService(): InvoiceImportService {
  return createInvoiceImportService(KNOWN_INVOICE_PROFILES, [
    new CsvInvoiceExtractor(),
    new PdfInvoiceExtractor(),
  ]);
}
