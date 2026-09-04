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
  const trimmedValue = value.trim();
  const isParenthesized = /^\(.*\)$/.test(trimmedValue);
  let normalized = trimmedValue.replace(/[^\d,.-]/g, "");

  if (format === "pt-BR") {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (format === "en-US") {
    normalized = normalized.replace(/,/g, "");
  } else {
    normalized = normalizeAutomaticAmount(normalized);
  }

  const parsedAmount = Number(normalized);

  if (!Number.isFinite(parsedAmount)) {
    throw new InvoiceParseError(`Valor inválido na linha ${lineNumber}: ${value}`);
  }

  // Os cálculos financeiros posteriores utilizam somente números inteiros.
  const amountInCents = Math.round(parsedAmount * 100);
  return isParenthesized ? -Math.abs(amountInCents) : amountInCents;
}

function normalizeAutomaticAmount(value: string): string {
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  const decimalSeparatorIndex = Math.max(lastComma, lastDot);

  if (decimalSeparatorIndex === -1) {
    return value;
  }

  const decimalPlaces = value.length - decimalSeparatorIndex - 1;

  if (decimalPlaces !== 2) {
    return value.replace(/[.,]/g, "");
  }

  const integerPart = value
    .slice(0, decimalSeparatorIndex)
    .replace(/[.,]/g, "");
  const decimalPart = value.slice(decimalSeparatorIndex + 1);
  return `${integerPart}.${decimalPart}`;
}
