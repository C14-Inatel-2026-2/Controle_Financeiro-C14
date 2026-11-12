import type { InvoicePreview } from "./invoice.js";

export interface ImportPreview extends InvoicePreview {
  fingerprint: string;
  ignoredNegativeCount: number;
}

export interface ImportReceipt {
  importId: number;
  importedCount: number;
  totalInCents: number;
}

// O adaptador deve salvar o registro da importação e todos os lançamentos atomicamente.
export interface InvoiceImportRepository {
  save(userId: number, preview: ImportPreview): Promise<ImportReceipt>;
}

export class DuplicateInvoiceError extends Error {}
export class InvoicePreviewChangedError extends Error {}
export class InvoiceConfirmationUnavailableError extends Error {}
export class InvoiceUserRequiredError extends Error {}
