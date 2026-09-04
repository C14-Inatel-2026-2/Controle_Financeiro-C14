/**
 * Contratos de entrada e saída da importação de faturas.
 *
 * Utilizado tanto no fluxo de bancos conhecidos quanto no CSV manual. Não
 * contém leitura de arquivos, regras de layout ou persistência.
 */

// Formatos permitidos pelo escopo atual da aplicação.
export const INVOICE_FORMATS = ["csv", "pdf"] as const;

export type InvoiceFormat = (typeof INVOICE_FORMATS)[number];

export interface InvoiceFile {
  // Nome e MIME ajudam a detectar inconsistências, mas o conteúdo é a fonte
  // principal para decidir o formato real do arquivo.
  fileName: string;
  content: Uint8Array;
  mimeType?: string;
  // A senha permanece disponível somente durante a leitura do PDF protegido.
  password?: string;
}

export interface InvoiceEntry {
  // Data normalizada no formato AAAA-MM-DD.
  occurredOn: string;
  description: string;
  // Valor inteiro em centavos para evitar imprecisão em cálculos decimais.
  amountInCents: number;
}

export interface ParsedInvoice {
  entries: InvoiceEntry[];
  totalInCents: number;
}

// `mode` diferencia a entrada de banco conhecido da entrada manual.
export type InvoiceImportRequest =
  | {
      mode: "known-bank";
      bankId: string;
      file: InvoiceFile;
    }
  | {
      mode: "template";
      content: string;
    };

export interface InvoicePreview extends ParsedInvoice {
  // Identifica a origem e o profile responsável pela pré-visualização.
  source:
    | {
        mode: "known-bank";
        bankId: string;
        format: InvoiceFormat;
        profileId: string;
      }
    | {
        mode: "template";
        format: "csv";
        profileId: string;
      };
}

export interface KnownBankOption {
  id: string;
  name: string;
  formats: InvoiceFormat[];
}

export interface InvoiceImportOptions {
  knownBanks: KnownBankOption[];
  customTemplate: {
    id: "template";
    label: string;
    example: string;
    aiUsageNotice: string;
    aiPrompt: string;
  };
}
