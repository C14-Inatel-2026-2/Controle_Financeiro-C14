import { InvoiceParseError } from "../../../domain/invoice-errors.js";

/**
 * Parser de texto delimitado utilizado pelo extractor CSV manual.
 *
 * Separa cabeçalho, linhas e colunas, respeitando campos entre aspas. Não
 * contém regras bancárias ou financeiras e não participa do fluxo de PDF.
 */

export type Delimiter = "," | ";";

export interface DelimitedTable {
  delimiter: Delimiter;
  header: string[];
  rows: string[][];
}

export function parseDelimitedText(content: string): DelimitedTable {
  if (content.trim() === "") {
    throw new InvoiceParseError("A fatura está vazia");
  }

  const normalizedContent = content.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(normalizedContent);
  const parsedRows = splitRows(normalizedContent, delimiter);

  if (parsedRows.length < 2) {
    throw new InvoiceParseError(
      "A fatura deve conter um cabeçalho e ao menos um lançamento",
    );
  }

  const [header, ...rows] = parsedRows;

  return { delimiter, header, rows };
}

export function detectDelimiter(content: string): Delimiter {
  const firstLine = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .find((line) => line.trim() !== "");

  if (!firstLine) {
    throw new InvoiceParseError("A fatura está vazia");
  }

  const commaCount = countOutsideQuotes(firstLine, ",");
  const semicolonCount = countOutsideQuotes(firstLine, ";");

  if (commaCount === 0 && semicolonCount === 0) {
    throw new InvoiceParseError("Não foi possível identificar o separador do CSV");
  }

  return semicolonCount > commaCount ? ";" : ",";
}

function countOutsideQuotes(value: string, character: Delimiter): number {
  let count = 0;
  let insideQuotes = false;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') {
      // Duas aspas seguidas dentro de um campo representam uma aspa literal.
      if (insideQuotes && value[index + 1] === '"') {
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (!insideQuotes && value[index] === character) {
      count += 1;
    }
  }

  return count;
}

function splitRows(content: string, delimiter: Delimiter): string[][] {
  // O processamento caractere a caractere preserva separadores e quebras de
  // linha que estejam dentro de campos delimitados por aspas.
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (character === '"') {
      if (insideQuotes && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (character === delimiter && !insideQuotes) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && content[index + 1] === "\n") {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (insideQuotes) {
    throw new InvoiceParseError("O CSV possui aspas não fechadas");
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
