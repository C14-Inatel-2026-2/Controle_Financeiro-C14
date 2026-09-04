import type {
  InvoiceEntry,
  ParsedInvoice,
} from "../../../domain/invoice.js";
import {
  InvoiceParseError,
  InvoiceTotalMismatchError,
} from "../../../domain/invoice-errors.js";
import type {
  ExtractedInvoiceData,
  ExtractedPdfInvoiceData,
  ExtractedPdfPage,
  ExtractedPdfTextItem,
} from "../../../domain/invoice-extractor.js";
import {
  normalizeHeader,
  parseAmountInCents,
  parseInvoiceDate,
} from "../../../domain/invoice-field-parsers.js";
import type { InvoiceProfile } from "../../../domain/invoice-profile.js";

/**
 * Profile do layout Itaú PDF versão 1.
 *
 * Recebe textos e coordenadas produzidos pelo extractor PDF e aplica somente
 * as regras deste layout. Alterações estruturais incompatíveis devem originar
 * outra versão de profile em vez de condicionais acumuladas nesta classe.
 */

const SHORT_DATE = /^\d{2}\/\d{2}$/;
const MONEY = /^-?\d{1,3}(?:\.\d{3})*,\d{2}$/;
// Compensa pequenas diferenças de coordenadas geradas pelo PDF.
const SAME_LINE_TOLERANCE = 1.5;
const DESCRIPTION_LINE_HEIGHT = 14;

export class ItauPdfV1Profile implements InvoiceProfile {
  readonly id = "itau-pdf-v1";
  readonly bankId = "itau";
  readonly bankName = "Itaú";
  readonly format = "pdf" as const;
  readonly version = "1";
  readonly priority = 100;

  matches(data: ExtractedInvoiceData): boolean {
    if (data.format !== "pdf") {
      return false;
    }

    // A combinação de marcadores reduz falsos positivos causados por textos
    // isolados que também poderiam existir em documentos de outro layout.
    const text = normalizeText(
      data.pages.flatMap((page) => page.items.map((item) => item.text)).join(" "),
    );

    return (
      text.includes("banco itau s.a.") &&
      text.includes("resumo da fatura em r$") &&
      text.includes("lancamentos: compras e saques") &&
      text.includes("total dos lancamentos atuais")
    );
  }

  map(data: ExtractedInvoiceData): ParsedInvoice {
    const pdf = requirePdfData(data);
    const dueDate = findDueDate(pdf);
    const nationalEntries = parseNationalPurchases(pdf, dueDate);
    const internationalEntries = parseInternationalPurchases(pdf, dueDate);
    const productEntries = parseProductsAndServices(pdf, dueDate);
    // Cada seção possui estrutura visual própria e é interpretada separadamente.
    const entries = [
      ...nationalEntries,
      ...internationalEntries,
      ...productEntries,
    ];
    const actualTotal = entries.reduce(
      (total, entry) => total + entry.amountInCents,
      0,
    );
    const expectedTotal = findCurrentStatementTotal(pdf);

    // Uma divergência indica extração incompleta ou mudança de layout.
    if (actualTotal !== expectedTotal) {
      throw new InvoiceTotalMismatchError(expectedTotal, actualTotal);
    }

    return { entries, totalInCents: actualTotal };
  }
}

function requirePdfData(data: ExtractedInvoiceData): ExtractedPdfInvoiceData {
  if (data.format !== "pdf") {
    throw new InvoiceParseError("O perfil Itaú PDF v1 requer um arquivo PDF");
  }

  return data;
}

function findDueDate(data: ExtractedPdfInvoiceData): DateParts {
  for (const page of data.pages) {
    for (const item of page.items) {
      const match = /vencimento:\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(item.text);

      if (match) {
        return {
          day: Number(match[1]),
          month: Number(match[2]),
          year: Number(match[3]),
        };
      }
    }
  }

  throw new InvoiceParseError("Vencimento não encontrado na fatura Itaú");
}

interface DateParts {
  day: number;
  month: number;
  year: number;
}

function parseNationalPurchases(
  data: ExtractedPdfInvoiceData,
  dueDate: DateParts,
): InvoiceEntry[] {
  const page = findPageWithText(data, "lancamentos: compras e saques");
  // O layout possui duas colunas com o mesmo título; a coordenada X delimita
  // os lançamentos pertencentes a cada uma.
  const headers = page.items
    .filter((item) => normalizeText(item.text) === "lancamentos: compras e saques")
    .sort((first, second) => first.x - second.x);

  if (headers.length < 2) {
    throw new InvoiceParseError(
      "As duas colunas de compras e saques não foram encontradas",
    );
  }

  const entries: InvoiceEntry[] = [];

  for (const [index, header] of headers.entries()) {
    const minimumX = header.x - 5;
    const maximumX = (headers[index + 1]?.x ?? page.width - 30) - 5;
    const dateItems = page.items.filter(
      (item) =>
        SHORT_DATE.test(item.text) &&
        item.x >= minimumX &&
        item.x < maximumX &&
        item.y < header.y,
    );

    entries.push(
      ...dateItems.map((dateItem) =>
        parseDatedEntry(page, dateItem, minimumX, maximumX, dueDate),
      ),
    );
  }

  if (entries.length === 0) {
    throw new InvoiceParseError("Nenhuma compra nacional foi encontrada");
  }

  return entries;
}

function parseInternationalPurchases(
  data: ExtractedPdfInvoiceData,
  dueDate: DateParts,
): InvoiceEntry[] {
  const page = findPageWithText(data, "lancamentos internacionais");
  const header = findExactItem(page, "lancamentos internacionais");
  const totalAnchor = findExactItem(page, "total transacoes inter. em r$");
  // Data e descrição compartilham um fragmento; o valor é localizado pela
  // coordenada vertical correspondente.
  const datedDescriptions = page.items.filter(
    (item) =>
      /^(\d{2}\/\d{2})\s+.+/.test(item.text) &&
      item.x >= header.x - 5 &&
      item.y < header.y &&
      item.y > totalAnchor.y,
  );
  const entries = datedDescriptions.map((item) => {
    const [, shortDate, description] = /^(\d{2}\/\d{2})\s+(.+)/.exec(
      item.text,
    )!;
    const amount = findAmountOnLine(page, item.y, item.x, page.width - 35);

    return {
      occurredOn: inferTransactionDate(shortDate, dueDate),
      description: cleanDescription(description),
      amountInCents: parsePdfAmount(amount.text, page.pageNumber),
    };
  });
  const iofAnchor = findOptionalExactItem(page, "repasse de iof em r$");

  // O IOF é opcional e não apresenta data própria neste layout.
  if (iofAnchor) {
    const amount = findAmountOnLine(
      page,
      iofAnchor.y,
      iofAnchor.x,
      page.width - 35,
    );
    entries.push({
      occurredOn: formatDateParts(dueDate),
      description: "IOF sobre transações internacionais",
      amountInCents: parsePdfAmount(amount.text, page.pageNumber),
    });
  }

  return entries;
}

function parseProductsAndServices(
  data: ExtractedPdfInvoiceData,
  dueDate: DateParts,
): InvoiceEntry[] {
  const page = findPageWithText(data, "lancamentos: produtos e servicos");
  const header = findExactItem(page, "lancamentos: produtos e servicos");
  const totalAnchor = findExactItem(page, "lancamentos produtos e servicos");
  // O subtotal delimita a seção e impede a inclusão das parcelas futuras
  // apresentadas abaixo dele.
  const dateItems = page.items.filter(
    (item) =>
      SHORT_DATE.test(item.text) &&
      item.x >= header.x - 5 &&
      item.y < header.y &&
      item.y > totalAnchor.y,
  );

  return dateItems.map((dateItem) =>
    parseDatedEntry(
      page,
      dateItem,
      header.x - 5,
      page.width - header.x,
      dueDate,
    ),
  );
}

function parseDatedEntry(
  page: ExtractedPdfPage,
  dateItem: ExtractedPdfTextItem,
  minimumX: number,
  maximumX: number,
  dueDate: DateParts,
): InvoiceEntry {
  const amount = findAmountOnLine(page, dateItem.y, dateItem.x, maximumX);
  // A descrição pode ocupar vários fragmentos. Somente textos posicionados
  // entre a data e o valor são combinados.
  const description = page.items
    .filter(
      (item) =>
        item.x > dateItem.x &&
        item.x < amount.x &&
        item.x >= minimumX &&
        item.x < maximumX &&
        item.y <= dateItem.y + SAME_LINE_TOLERANCE &&
        item.y >= dateItem.y - DESCRIPTION_LINE_HEIGHT &&
        !MONEY.test(item.text) &&
        !SHORT_DATE.test(item.text),
    )
    .sort((first, second) => second.y - first.y || first.x - second.x)
    .map((item) => item.text)
    .join(" ");

  if (!description) {
    throw new InvoiceParseError(
      `Descrição não encontrada na página ${page.pageNumber}`,
    );
  }

  return {
    occurredOn: inferTransactionDate(dateItem.text, dueDate),
    description: cleanDescription(description),
    amountInCents: parsePdfAmount(amount.text, page.pageNumber),
  };
}

function findAmountOnLine(
  page: ExtractedPdfPage,
  y: number,
  minimumX: number,
  maximumX: number,
): ExtractedPdfTextItem {
  // O valor final ocupa a posição mais à direita no layout parametrizado.
  const amount = page.items
    .filter(
      (item) =>
        MONEY.test(item.text) &&
        item.x > minimumX &&
        item.x < maximumX &&
        Math.abs(item.y - y) <= SAME_LINE_TOLERANCE,
    )
    .sort((first, second) => second.x - first.x)[0];

  if (!amount) {
    throw new InvoiceParseError(
      `Valor não encontrado na página ${page.pageNumber}`,
    );
  }

  return amount;
}

function findCurrentStatementTotal(data: ExtractedPdfInvoiceData): number {
  const page = findPageWithText(data, "total dos lancamentos atuais");
  const anchor = findExactItem(page, "total dos lancamentos atuais");
  const amount = findAmountOnLine(page, anchor.y, anchor.x, page.width - 35);
  return parsePdfAmount(amount.text, page.pageNumber);
}

function findPageWithText(
  data: ExtractedPdfInvoiceData,
  expectedText: string,
): ExtractedPdfPage {
  const page = data.pages.find((candidate) =>
    candidate.items.some(
      (item) => normalizeText(item.text) === expectedText,
    ),
  );

  if (!page) {
    throw new InvoiceParseError(`Seção não encontrada: ${expectedText}`);
  }

  return page;
}

function findExactItem(
  page: ExtractedPdfPage,
  expectedText: string,
): ExtractedPdfTextItem {
  const item = findOptionalExactItem(page, expectedText);

  if (!item) {
    throw new InvoiceParseError(`Seção não encontrada: ${expectedText}`);
  }

  return item;
}

function findOptionalExactItem(
  page: ExtractedPdfPage,
  expectedText: string,
): ExtractedPdfTextItem | undefined {
  return page.items.find(
    (item) => normalizeText(item.text) === expectedText,
  );
}

function inferTransactionDate(shortDate: string, dueDate: DateParts): string {
  const [day, month] = shortDate.split("/").map(Number);
  // Meses posteriores ao mês de vencimento pertencem ao ano anterior.
  const year = month > dueDate.month ? dueDate.year - 1 : dueDate.year;
  return parseInvoiceDate(
    `${day.toString().padStart(2, "0")}/${month
      .toString()
      .padStart(2, "0")}/${year}`,
    1,
    ["pt-BR"],
  );
}

function formatDateParts(date: DateParts): string {
  return `${date.year}-${date.month.toString().padStart(2, "0")}-${date.day
    .toString()
    .padStart(2, "0")}`;
}

function parsePdfAmount(value: string, pageNumber: number): number {
  return parseAmountInCents(value, pageNumber, "pt-BR");
}

function cleanDescription(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return normalizeHeader(value).replace(/\s+/g, " ");
}
