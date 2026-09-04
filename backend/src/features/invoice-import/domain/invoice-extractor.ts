import type { InvoiceFile, InvoiceFormat } from "./invoice.js";

/**
 * Contratos dos extractors de PDF e CSV.
 *
 * Um extractor transforma o formato físico em dados estruturais, sem aplicar
 * regras de banco. A interpretação financeira permanece nos profiles.
 */

export interface ExtractedCsvInvoiceData {
  format: "csv";
  encoding: "utf-8" | "windows-1252";
  delimiter: "," | ";";
  header: string[];
  rows: string[][];
}

export interface ExtractedPdfInvoiceData {
  format: "pdf";
  pages: readonly ExtractedPdfPage[];
}

export interface ExtractedPdfPage {
  pageNumber: number;
  width: number;
  height: number;
  items: readonly ExtractedPdfTextItem[];
}

export interface ExtractedPdfTextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ExtractedInvoiceData =
  | ExtractedCsvInvoiceData
  | ExtractedPdfInvoiceData;

export interface InvoiceExtractor {
  readonly format: InvoiceFormat;

  extract(file: InvoiceFile): Promise<ExtractedInvoiceData>;
}
