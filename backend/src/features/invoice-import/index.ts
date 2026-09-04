/**
 * API pública da feature de importação de faturas.
 *
 * Atende os fluxos de bancos conhecidos e CSV manual. Camadas externas devem
 * importar deste módulo para não depender da organização interna da feature.
 */

export { createDefaultInvoiceImportService } from "./config/create-default-invoice-import-service.js";
export type {
  InvoiceEntry,
  InvoiceFile,
  InvoiceImportOptions,
  InvoiceImportRequest,
  InvoicePreview,
  ParsedInvoice,
} from "./domain/invoice.js";
export {
  AmbiguousInvoiceLayoutError,
  InvalidInvoiceFileError,
  InvalidInvoicePasswordError,
  InvoiceExtractorNotConfiguredError,
  InvoiceParseError,
  InvoicePasswordRequiredError,
  InvoiceTotalMismatchError,
  UnknownInvoiceLayoutError,
  UnsupportedBankError,
  UnsupportedBankFormatError,
  UnsupportedInvoiceFormatError,
} from "./domain/invoice-errors.js";
