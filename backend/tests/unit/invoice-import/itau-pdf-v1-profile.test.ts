import { describe, expect, it } from "vitest";

import { createDefaultInvoiceImportService } from "../../../src/features/invoice-import/config/create-default-invoice-import-service.js";
import { InvoiceTotalMismatchError } from "../../../src/features/invoice-import/domain/invoice-errors.js";
import type {
  ExtractedPdfInvoiceData,
  ExtractedPdfTextItem,
} from "../../../src/features/invoice-import/domain/invoice-extractor.js";
import { ItauPdfV1Profile } from "../../../src/features/invoice-import/infrastructure/profiles/itau/itau-pdf-v1-profile.js";

// Documento sintético que preserva somente a estrutura necessária ao teste.
// Nenhum dado da fatura real é incluído nesta fixture.

const textItem = (
  text: string,
  x: number,
  y: number,
): ExtractedPdfTextItem => ({ text, x, y, width: text.length * 5, height: 9 });

function createSyntheticItauInvoice(total = "400,00"): ExtractedPdfInvoiceData {
  return {
    format: "pdf",
    pages: [
      {
        pageNumber: 1,
        width: 595,
        height: 842,
        items: [
          textItem("Banco Itaú S.A.", 40, 100),
          textItem("Resumo da fatura em R$", 365, 720),
          textItem("Vencimento: 21/08/2026", 200, 668),
        ],
      },
      {
        pageNumber: 2,
        width: 595,
        height: 842,
        items: [
          textItem("Lançamentos: compras e saques", 133, 719),
          textItem("Lançamentos: compras e saques", 351, 719),
          textItem("15/07", 133, 688),
          textItem("LOJA ALFA", 161, 688),
          textItem("outros SAO PAULO", 161, 679),
          textItem("100,00", 312, 688),
          textItem("10/08", 351, 699),
          textItem("MERCADO BETA", 379, 699),
          textItem("supermercado CAMPINAS", 379, 690),
          textItem("50,00", 533, 699),
          textItem("12/08", 351, 542),
          textItem("FARMACIA GAMA", 379, 542),
          textItem("saude CAMPINAS", 379, 533),
          textItem("25,00", 533, 542),
          textItem("Lançamentos internacionais", 351, 439),
          textItem("09/08 COMPRA INTERNACIONAL", 351, 409),
          textItem("200,00", 530, 409),
          textItem("Total transações inter. em R$", 351, 380),
          textItem("200,00", 527, 380),
          textItem("Repasse de IOF em R$", 351, 369),
          textItem("5,00", 535, 369),
        ],
      },
      {
        pageNumber: 3,
        width: 595,
        height: 842,
        items: [
          textItem("Lançamentos: produtos e serviços", 143, 769),
          textItem("25/07", 143, 749),
          textItem("Mensalidade", 170, 749),
          textItem("Plano do cartão", 170, 739),
          textItem("20,00", 317, 749),
          textItem("Lançamentos produtos e serviços", 143, 708),
          textItem("20,00", 315, 708),
          textItem("Total dos lançamentos atuais", 143, 681),
          textItem(total, 307, 681),
          textItem("Compras parceladas - próximas faturas", 143, 655),
          textItem("15/07", 143, 635),
          textItem("COMPRA FUTURA", 170, 635),
          textItem("999,00", 316, 635),
        ],
      },
    ],
  };
}

describe("ItauPdfV1Profile", () => {
  const profile = new ItauPdfV1Profile();

  it("publishes Itaú PDF in the production profile catalog", () => {
    const service = createDefaultInvoiceImportService();

    expect(service.getOptions().knownBanks).toContainEqual({
      id: "itau",
      name: "Itaú",
      formats: ["pdf"],
    });
  });

  it("recognizes the structural anchors of the Itaú PDF v1 layout", () => {
    expect(profile.matches(createSyntheticItauInvoice())).toBe(true);
    expect(
      profile.matches({
        ...createSyntheticItauInvoice(),
        pages: [
          {
            pageNumber: 1,
            width: 595,
            height: 842,
            items: [textItem("Outro banco", 40, 100)],
          },
        ],
      }),
    ).toBe(false);
  });

  it("extracts national, international, IOF and service entries", () => {
    const invoice = profile.map(createSyntheticItauInvoice());

    expect(invoice.entries).toEqual([
      {
        occurredOn: "2026-07-15",
        description: "LOJA ALFA outros SAO PAULO",
        amountInCents: 10000,
      },
      {
        occurredOn: "2026-08-10",
        description: "MERCADO BETA supermercado CAMPINAS",
        amountInCents: 5000,
      },
      {
        occurredOn: "2026-08-12",
        description: "FARMACIA GAMA saude CAMPINAS",
        amountInCents: 2500,
      },
      {
        occurredOn: "2026-08-09",
        description: "COMPRA INTERNACIONAL",
        amountInCents: 20000,
      },
      {
        occurredOn: "2026-08-21",
        description: "IOF sobre transações internacionais",
        amountInCents: 500,
      },
      {
        occurredOn: "2026-07-25",
        description: "Mensalidade Plano do cartão",
        amountInCents: 2000,
      },
    ]);
    expect(invoice.totalInCents).toBe(40000);
  });

  it("does not import purchases listed only for future invoices", () => {
    const invoice = profile.map(createSyntheticItauInvoice());

    expect(invoice.entries).not.toContainEqual(
      expect.objectContaining({ description: "COMPRA FUTURA" }),
    );
  });

  it("fails safely when extracted entries do not match the statement total", () => {
    expect(() => profile.map(createSyntheticItauInvoice("401,00"))).toThrow(
      InvoiceTotalMismatchError,
    );
  });

  it("uses the previous year for December purchases on a January invoice", () => {
    const invoice = createSyntheticItauInvoice();
    const dueDate = invoice.pages[0].items.find((item) =>
      item.text.startsWith("Vencimento:"),
    )!;
    dueDate.text = "Vencimento: 21/01/2027";
    const transactionDate = invoice.pages[1].items.find(
      (item) => item.text === "15/07",
    )!;
    transactionDate.text = "15/12";

    expect(profile.map(invoice).entries[0].occurredOn).toBe("2026-12-15");
  });
});
