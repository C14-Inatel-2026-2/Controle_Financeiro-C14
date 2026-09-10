import type {
  InvoiceEntry,
  ParsedInvoice,
} from "../../../domain/invoice.js";
import { InvoiceParseError } from "../../../domain/invoice-errors.js";
import type { ExtractedInvoiceData } from "../../../domain/invoice-extractor.js";
import {
  type InvoiceAmountFormat,
  type InvoiceDateFormat,
  normalizeHeader,
  parseAmountInCents,
  parseInvoiceDate,
} from "../../../domain/invoice-field-parsers.js";
import type { InvoiceProfile } from "../../../domain/invoice-profile.js";

/**
 * Profile configurável utilizado pelo template CSV manual.
 *
 * Não integra o catálogo de bancos conhecidos. Associa as colunas extraídas
 * aos campos financeiros de data, descrição e valor.
 */

interface CsvColumnAliases {
  occurredOn: readonly string[];
  description: readonly string[];
  amountInCents: readonly string[];
}

export interface ConfigurableCsvProfileOptions {
  id: string;
  bankId: string;
  bankName: string;
  version: string;
  priority?: number;
  columns: CsvColumnAliases;
  requiredHeaders?: readonly string[];
  acceptedDateFormats: readonly InvoiceDateFormat[];
  amountFormat: InvoiceAmountFormat;
}

type RequiredColumn = keyof CsvColumnAliases;
type ColumnIndexes = Record<RequiredColumn, number>;

export class ConfigurableCsvProfile implements InvoiceProfile {
  readonly format = "csv" as const;
  readonly id: string;
  readonly bankId: string;
  readonly bankName: string;
  readonly version: string;
  readonly priority: number;

  constructor(private readonly options: ConfigurableCsvProfileOptions) {
    this.id = options.id;
    this.bankId = options.bankId;
    this.bankName = options.bankName;
    this.version = options.version;
    this.priority = options.priority ?? 0;
  }

  matches(data: ExtractedInvoiceData): boolean {
    if (data.format !== "csv") {
      return false;
    }

    // A normalização permite comparar variações de caixa e acentuação.
    const normalizedHeader = data.header.map(normalizeHeader);
    const hasMappedColumns = Object.values(this.options.columns).every(
      (aliases: readonly string[]) =>
        aliases.some((alias: string) =>
          normalizedHeader.includes(normalizeHeader(alias)),
        ),
    );
    const hasRequiredHeaders = (this.options.requiredHeaders ?? []).every(
      (requiredHeader) =>
        normalizedHeader.includes(normalizeHeader(requiredHeader)),
    );

    return hasMappedColumns && hasRequiredHeaders;
  }

  map(data: ExtractedInvoiceData): ParsedInvoice {
    if (data.format !== "csv") {
      throw new InvoiceParseError(
        `O perfil ${this.id} não pode interpretar o formato ${data.format}`,
      );
    }

    const indexes = this.findColumnIndexes(data.header);
    // Linhas vazias são ignoradas; todas as demais precisam ser válidas.
    const entries = data.rows
      .filter((row) => row.some((value) => value.trim() !== ""))
      .map((row, index) => this.parseEntry(row, indexes, index + 2));

    if (entries.length === 0) {
      throw new InvoiceParseError("A fatura não possui lançamentos");
    }

    return {
      entries,
      totalInCents: entries.reduce(
        (total, entry) => total + entry.amountInCents,
        0,
      ),
    };
  }

  private findColumnIndexes(header: string[]): ColumnIndexes {
    const normalizedHeader = header.map(normalizeHeader);
    const indexes = {} as ColumnIndexes;

    // Associa cada campo obrigatório ao índice correspondente no cabeçalho.
    for (const column of Object.keys(this.options.columns) as RequiredColumn[]) {
      const aliases = this.options.columns[column];
      const index = normalizedHeader.findIndex((headerValue) =>
        aliases.some(
          (alias) => headerValue === normalizeHeader(alias),
        ),
      );

      if (index === -1) {
        throw new InvoiceParseError(
          `Coluna obrigatória ausente: ${aliases.join("/")}`,
        );
      }

      indexes[column] = index;
    }

    return indexes;
  }

  private parseEntry(
    row: string[],
    indexes: ColumnIndexes,
    lineNumber: number,
  ): InvoiceEntry {
    const date = row[indexes.occurredOn]?.trim() ?? "";
    const description = row[indexes.description]?.trim() ?? "";
    const amount = row[indexes.amountInCents]?.trim() ?? "";

    if (!description) {
      throw new InvoiceParseError(`Descrição ausente na linha ${lineNumber}`);
    }

    // A saída utiliza o mesmo modelo normalizado dos profiles bancários.
    return {
      occurredOn: parseInvoiceDate(
        date,
        lineNumber,
        this.options.acceptedDateFormats,
      ),
      description,
      amountInCents: parseAmountInCents(
        amount,
        lineNumber,
        this.options.amountFormat,
      ),
    };
  }
}
