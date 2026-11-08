import type { InvoiceEntry, ParsedInvoice } from "../../../domain/invoice.js";
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

const PURCHASES = "lancamentos:comprasesaques";
const INTERNATIONAL = "lancamentosinternacionais";
const SERVICES = "lancamentos:produtoseservicos";
const CURRENT_TOTAL = "totaldoslancamentosatuais";
const IOF = "repassedeiofemr$";
const ENTRY_SECTIONS = new Set([PURCHASES, INTERNATIONAL, SERVICES]);
const SECTION_BOUNDARIES = new Set([
  ...ENTRY_SECTIONS,
  CURRENT_TOTAL,
  "lancamentosprodutoseservicos",
  "comprasparceladas-proximasfaturas",
  "pagamentosefetuados",
  "limitesdecredito",
]);
const SHORT_DATE = /^\d{2}\/\d{2}$/;
const MONEY = /^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{2}$/;
const LINE_TOLERANCE = 1.5;

/**
 * Layout Itaú Cartões com compras em duas colunas e continuação em outras
 * páginas. Seções internacionais e de serviços podem estar ausentes.
 * As coordenadas delimitam cada seção para não importar pagamentos nem
 * parcelas de próximas faturas como despesas atuais.
 */
export class ItauPdfV2Profile implements InvoiceProfile {
  readonly id = "itau-pdf-v2";
  readonly bankId = "itau";
  readonly bankName = "Itaú";
  readonly format = "pdf" as const;
  readonly version = "2";
  readonly priority = 110;

  matches(data: ExtractedInvoiceData): boolean {
    if (data.format !== "pdf") return false;

    const labels = data.pages.flatMap((page) =>
      page.items.map((item) => normalizeLabel(item.text)),
    );
    return (
      labels.some((label) => label.includes("itaucartoes")) &&
      labels.includes("resumodafaturaemr$") &&
      labels.includes(PURCHASES) &&
      labels.includes(CURRENT_TOTAL)
    );
  }

  map(data: ExtractedInvoiceData): ParsedInvoice {
    if (data.format !== "pdf") {
      throw new InvoiceParseError("O perfil Itaú PDF v2 requer um arquivo PDF");
    }

    const dueDate = findDueDate(data);
    const entries = data.pages.flatMap((page) =>
      page.items
        .filter((item) => ENTRY_SECTIONS.has(normalizeLabel(item.text)))
        .sort((first, second) => first.x - second.x || second.y - first.y)
        .flatMap((header) => parseSection(page, header, dueDate)),
    );
    if (entries.length === 0) {
      throw new InvoiceParseError("Nenhum lançamento atual foi encontrado");
    }

    const totalInCents = entries.reduce((sum, entry) => sum + entry.amountInCents, 0);
    const expectedTotal = findCurrentTotal(data);
    if (!Number.isSafeInteger(totalInCents)) {
      throw new InvoiceParseError("Total da fatura fora do limite permitido");
    }
    // Neste layout, "Desc Antecipa Parcelas" é um ajuste separado do subtotal
    // "lançamentos atuais", embora apareça na tabela de compras. Outros créditos
    // continuam compondo a conferência. Todos são preservados para o workflow
    // aplicar a regra de descarte de negativos, sem eliminar compras repetidas.
    const reconciledTotal = entries.reduce((sum, entry) => {
      const separateDiscount = entry.amountInCents < 0 &&
        normalizeLabel(entry.description) === "descantecipaparcelas";
      return sum + (separateDiscount ? 0 : entry.amountInCents);
    }, 0);
    if (!Number.isSafeInteger(reconciledTotal)) {
      throw new InvoiceParseError("Total da fatura fora do limite permitido");
    }
    if (reconciledTotal !== expectedTotal) {
      throw new InvoiceTotalMismatchError(expectedTotal, reconciledTotal);
    }
    return { entries, totalInCents };
  }
}

function parseSection(
  page: ExtractedPdfPage,
  header: ExtractedPdfTextItem,
  dueDate: string,
): InvoiceEntry[] {
  const boundaries = page.items.filter((item) =>
    item.y < header.y &&
    Math.abs(item.x - header.x) <= 5 &&
    SECTION_BOUNDARIES.has(normalizeLabel(item.text)),
  );
  // No sistema de coordenadas do PDF, valores menores de Y ficam mais abaixo.
  const bottom = Math.max(0, ...boundaries.map((item) => item.y));
  const sectionItems = page.items.filter((item) =>
    item.y < header.y && item.y > bottom &&
    item.x >= header.x - 5 && item.x < columnEnd(page, header.x),
  );
  const international = normalizeLabel(header.text) === INTERNATIONAL;
  const dates = sectionItems
    .filter((item) => Math.abs(item.x - header.x) <= 5)
    .flatMap((item) => {
      const date = readDate(item.text, international);
      return date ? [{ item, date }] : [];
    })
    .sort((first, second) => second.item.y - first.item.y);

  const entries = dates.map(({ item, date }, index): InvoiceEntry => {
    const amount = findAmount(page, item.y, header.x);
    const nextDateY = dates[index + 1]?.item.y ?? bottom;
    const description = date.description ?? sectionItems
      .filter((part) =>
        part.x > item.x + 5 && part.x < amount.x &&
        part.y <= item.y + LINE_TOLERANCE && part.y >= item.y - 14 &&
        part.y > nextDateY + LINE_TOLERANCE,
      )
      .sort((first, second) => second.y - first.y || first.x - second.x)
      .map((part) => part.text)
      .join(" ");
    if (!description.trim()) {
      throw new InvoiceParseError(`Descrição não encontrada na página ${page.pageNumber}`);
    }
    return {
      occurredOn: inferTransactionDate(date.shortDate, dueDate, page.pageNumber),
      description: description.replace(/\s+/g, " ").trim(),
      amountInCents: parseAmountInCents(compact(amount.text), page.pageNumber, "pt-BR"),
    };
  });

  // O valor em reais está na linha da compra internacional. A linha seguinte
  // contém moeda estrangeira e câmbio, que não são novas despesas.
  if (international) {
    for (const item of sectionItems.filter((part) => normalizeLabel(part.text) === IOF)) {
      const amount = findAmount(page, item.y, header.x);
      entries.push({
        occurredOn: dueDate,
        description: "IOF sobre transações internacionais",
        amountInCents: parseAmountInCents(compact(amount.text), page.pageNumber, "pt-BR"),
      });
    }
  }
  return entries;
}

function readDate(text: string, international: boolean) {
  if (SHORT_DATE.test(compact(text))) return { shortDate: compact(text) };
  if (international) {
    // Nesta seção, data e estabelecimento podem compartilhar o mesmo fragmento.
    const match = /^(\d\s*\d\s*\/\s*\d\s*\d)\s+(.+)$/.exec(text.trim());
    if (match) return { shortDate: compact(match[1]), description: match[2] };
  }
  return undefined;
}

function findAmount(page: ExtractedPdfPage, y: number, columnX: number) {
  const amount = page.items
    .filter((item) =>
      item.x > columnX + 140 * page.width / 595 &&
      item.x < columnEnd(page, columnX) &&
      Math.abs(item.y - y) <= LINE_TOLERANCE && MONEY.test(compact(item.text)),
    )
    .sort((first, second) => second.x - first.x)[0];
  if (!amount) {
    throw new InvoiceParseError(`Valor não encontrado na página ${page.pageNumber}`);
  }
  return amount;
}

function columnEnd(page: ExtractedPdfPage, columnX: number): number {
  // Neste layout A4, cada coluna ocupa até 210 dos 595 pontos de largura.
  // O limite relativo ao título também funciona na página de continuação,
  // onde a coluna esquerda fica deslocada e não há uma segunda coluna.
  return columnX + 210 * page.width / 595;
}

function findCurrentTotal(data: ExtractedPdfInvoiceData): number {
  const totals = data.pages.flatMap((page) => page.items
    .filter((item) => normalizeLabel(item.text) === CURRENT_TOTAL)
    .map((item) => parseAmountInCents(
      compact(findAmount(page, item.y, item.x).text), page.pageNumber, "pt-BR",
    )),
  );
  if (totals.length !== 1) {
    throw new InvoiceParseError("Total dos lançamentos atuais ausente ou ambíguo");
  }
  return totals[0];
}

function findDueDate(data: ExtractedPdfInvoiceData): string {
  for (const page of data.pages) {
    for (const item of page.items) {
      const match = /vencimento:(\d{2}\/\d{2}\/\d{4})/.exec(normalizeLabel(item.text));
      if (match) return parseInvoiceDate(match[1], page.pageNumber, ["pt-BR"]);
    }
  }
  throw new InvoiceParseError("Vencimento não encontrado na fatura Itaú");
}

function inferTransactionDate(shortDate: string, dueDate: string, page: number): string {
  const [dueYear, dueMonth] = dueDate.split("-").map(Number);
  const month = Number(shortDate.slice(3));
  const year = month > dueMonth ? dueYear - 1 : dueYear;
  return parseInvoiceDate(`${shortDate}/${year}`, page, ["pt-BR"]);
}

function compact(value: string): string {
  // O PDF pode inserir espaços dentro de números e títulos. Esta regra fica
  // restrita aos campos deste layout; não altera descrições nem o parser CSV.
  return value.replace(/\s+/g, "");
}

function normalizeLabel(value: string): string {
  return compact(normalizeHeader(value));
}
