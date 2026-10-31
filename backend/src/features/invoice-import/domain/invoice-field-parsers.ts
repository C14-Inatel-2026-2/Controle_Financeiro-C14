import { InvoiceParseError } from "./invoice-errors.js";

/**
 * Normalizadores compartilhados pelos profiles de PDF e CSV.
 *
 * Convertem textos identificados pelos profiles em datas ISO e valores
 * inteiros em centavos, rejeitando dados inválidos.
 */

export type InvoiceDateFormat = "iso" | "pt-BR";
export type InvoiceAmountFormat = "auto" | "pt-BR" | "en-US";

export function normalizeHeader(value: string): string {
  // A normalização NFD separa letras e acentos para permitir comparação textual.
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseInvoiceDate(
  value: string,
  lineNumber: number,
  acceptedFormats: readonly InvoiceDateFormat[],
): string {
  const brazilianDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  let year: number;
  let month: number;
  let day: number;

  if (brazilianDate && acceptedFormats.includes("pt-BR")) {
    [, day, month, year] = brazilianDate.map(Number);
  } else if (isoDate && acceptedFormats.includes("iso")) {
    [, year, month, day] = isoDate.map(Number);
  } else {
    throw new InvoiceParseError(`Data inválida na linha ${lineNumber}: ${value}`);
  }

  // Date ajusta datas impossíveis automaticamente. A comparação inversa
  // impede, por exemplo, que 31/02 seja aceito como uma data de março.
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  if (!isValid) {
    throw new InvoiceParseError(`Data inválida na linha ${lineNumber}: ${value}`);
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parseAmountInCents(
  value: string,
  lineNumber: number,
  format: InvoiceAmountFormat,
): number {
  // Somente o prefixo monetário conhecido pode ser removido.
  const trimmedValue = value.trim().replace(/^R\$\s*/, "");

  const isParenthesized = /^\(.*\)$/.test(trimmedValue);

  const numericValue = isParenthesized
    ? trimmedValue.slice(1, -1).trim()
    : trimmedValue;

  const brazilianPattern =
    /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/;

  const americanPattern =
    /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;

  let effectiveFormat = format;

  if (format === "auto") {
    effectiveFormat = brazilianPattern.test(numericValue)
      ? "pt-BR"
      : "en-US";
  }

  const pattern =
    effectiveFormat === "pt-BR" ? brazilianPattern : americanPattern;

  // Parênteses já indicam estorno; um segundo sinal seria ambíguo.
  if (
    !pattern.test(numericValue) ||
    (isParenthesized && numericValue.startsWith("-"))
  ) {
    throw new InvoiceParseError(
      `Valor inválido na linha ${lineNumber}: ${value}`,
    );
  }

  const normalized =
    effectiveFormat === "pt-BR"
      ? numericValue.replace(/\./g, "").replace(",", ".")
      : numericValue.replace(/,/g, "");

  // A montagem textual dos centavos evita arredondamento com ponto flutuante.
  const [integerPart, decimalPart = ""] = normalized.split(".");
  const amountInCents = Number(integerPart + decimalPart.padEnd(2, "0"));

  if (!Number.isSafeInteger(amountInCents)) {
    throw new InvoiceParseError(
      `Valor inválido na linha ${lineNumber}: ${value}`,
    );
  }

  return isParenthesized ? -amountInCents : amountInCents;
}