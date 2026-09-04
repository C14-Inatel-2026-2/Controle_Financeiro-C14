import type { InvoiceFormat, ParsedInvoice } from "./invoice.js";
import type { ExtractedInvoiceData } from "./invoice-extractor.js";

/**
 * Contrato comum dos profiles de bancos conhecidos e do CSV manual.
 *
 * Um profile interpreta o significado dos dados extraídos em um layout
 * específico. A abertura do arquivo permanece sob responsabilidade do
 * extractor.
 */

export interface InvoiceProfile {
  readonly id: string;
  readonly bankId: string;
  readonly bankName: string;
  readonly format: InvoiceFormat;
  readonly version: string;
  readonly priority: number;

  // Verifica se os dados correspondem a esta versão de layout.
  matches(data: ExtractedInvoiceData): boolean;
  // Converte o layout externo para o modelo normalizado da aplicação.
  map(data: ExtractedInvoiceData): ParsedInvoice;
}
