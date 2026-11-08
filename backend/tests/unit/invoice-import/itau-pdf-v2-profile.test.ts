import { describe, expect, it } from "vitest";
import { InvoiceParseError, InvoiceTotalMismatchError } from "../../../src/features/invoice-import/domain/invoice-errors.js";
import type { ExtractedPdfInvoiceData, ExtractedPdfTextItem } from "../../../src/features/invoice-import/domain/invoice-extractor.js";
import { InvoiceProfileRegistry } from "../../../src/features/invoice-import/domain/invoice-profile-registry.js";
import { KNOWN_INVOICE_PROFILES } from "../../../src/features/invoice-import/config/known-invoice-profiles.js";
import { ItauPdfV2Profile } from "../../../src/features/invoice-import/infrastructure/profiles/itau/itau-pdf-v2-profile.js";

// Coordenadas e valores sintéticos permitem testar o layout sem guardar faturas pessoais.
const item = (text: string, x: number, y: number): ExtractedPdfTextItem =>
  ({ text, x, y, width: text.length * 4, height: 9 });

function row(date: string, description: string, amount: string, x: number, y: number) {
  return [item(date, x, y), item(description, x + 28, y), item(amount, x + 175, y)];
}

function invoice(total = "30,00"): ExtractedPdfInvoiceData {
  return {
    format: "pdf",
    pages: [
      { pageNumber: 1, width: 595, height: 842, items: [
        item("Itaú Cartões", 40, 80),
        item("Resumo da fatura em R$", 365, 720),
        item("Vencimento: 06/07/2026", 220, 670),
      ] },
      { pageNumber: 2, width: 595, height: 842, items: [
        item("Pagamentos efetuados", 133, 750),
        ...row("01/06", "Pagamento via conta", "-900,00", 133, 730),
        item("Lançamentos: compras e saques", 133, 690),
        ...row("10/06", "MERCADO ALFA", "10,00", 133, 660),
        item("Lançamentos: compras e saques", 351, 750),
        ...row("12/06", "LOJA BETA", "20,00", 351, 720),
        item("Total dos lançamentos atuais", 351, 640),
        item(total, 526, 640),
        item("Compras parceladas - próximas faturas", 351, 610),
        ...row("12/06", "PARCELA FUTURA", "999,00", 351, 590),
      ] },
    ],
  };
}

describe("ItauPdfV2Profile", () => {
  const profile = new ItauPdfV2Profile();

  it("reconhece o Itaú Cartões sem exigir a razão social e é selecionado no catálogo", () => {
    const data = invoice();
    expect(profile.matches(data)).toBe(true);
    expect(new InvoiceProfileRegistry(KNOWN_INVOICE_PROFILES).resolve("itau", data).id)
      .toBe("itau-pdf-v2");
    data.pages[0].items[0].text = "Outro banco";
    expect(profile.matches(data)).toBe(false);
    expect(profile.matches({ format: "csv", headers: [], rows: [] })).toBe(false);
  });

  it("lê apenas compras atuais, sem exigir seções internacionais ou de serviços", () => {
    expect(profile.map(invoice())).toEqual({ entries: [
      { occurredOn: "2026-06-10", description: "MERCADO ALFA", amountInCents: 1000 },
      { occurredOn: "2026-06-12", description: "LOJA BETA", amountInCents: 2000 },
    ], totalInCents: 3000 });
  });

  it("lê a continuação em outra página com uma coluna e preserva compras iguais", () => {
    const data = invoice("50,00");
    const page = data.pages[1];
    const totalIndex = page.items.findIndex(part => part.text === "Total dos lançamentos atuais");
    const total = page.items.splice(totalIndex, 2);
    data.pages.push({ pageNumber: 3, width: 595, height: 842, items: [
      item("Lançamentos: compras e saques", 152, 760),
      ...row("12/06", "LOJA BETA", "20,00", 152, 730),
      item(total[0].text, 152, 640), item(total[1].text, 327, 640),
    ] });
    const result = profile.map(data);
    expect(result.entries).toHaveLength(3);
    expect(result.entries.filter(entry => entry.description === "LOJA BETA")).toHaveLength(2);
    expect(result.totalInCents).toBe(5000);
  });

  it("normaliza espaços artificiais de títulos, datas e valores sem colar as descrições", () => {
    const data = invoice();
    for (const page of data.pages) {
      for (const part of page.items) {
        if (part.text !== "MERCADO ALFA" && part.text !== "LOJA BETA") {
          part.text = [...part.text].join(" ");
        }
      }
    }
    expect(profile.matches(data)).toBe(true);
    expect(profile.map(data)).toEqual(profile.map(invoice()));
  });

  it("lê compras internacionais e IOF em reais sem importar moeda estrangeira", () => {
    const data = invoice("135,00");
    data.pages[1].items.push(
      item("Lançamentos internacionais", 351, 700),
      item("15/06 COMPRA EXTERIOR", 351, 680), item("100,00", 526, 680),
      item("20,00", 490, 671), item("Dólar de conversão R$ 5,00", 379, 662),
      item("Total transações inter. em R$", 351, 655), item("100,00", 526, 655),
      item("Repasse de IOF em R$", 351, 648), item("5,00", 526, 648),
    );
    const result = profile.map(data);
    expect(result.entries).toHaveLength(4);
    expect(result.entries.slice(2)).toEqual([
      { occurredOn: "2026-06-15", description: "COMPRA EXTERIOR", amountInCents: 10000 },
      { occurredOn: "2026-07-06", description: "IOF sobre transações internacionais", amountInCents: 500 },
    ]);
    expect(result.totalInCents).toBe(13500);
  });

  it("lê serviços delimitados pelo subtotal e não confunde parcelas futuras", () => {
    const data = invoice("35,00");
    data.pages[1].items.push(
      item("Lançamentos: produtos e serviços", 351, 700),
      ...row("15/06", "Mensalidade", "5,00", 351, 680),
      item("Lançamentos produtos e serviços", 351, 660), item("5,00", 526, 660),
    );
    expect(profile.map(data).entries[2]).toEqual({
      occurredOn: "2026-06-15", description: "Mensalidade", amountInCents: 500,
    });
  });

  it("inclui créditos comuns na conferência antes do descarte pelo workflow", () => {
    const data = invoice("25,00");
    data.pages[1].items.push(...row("11/06", "ESTORNO LOJA", "-5,00", 133, 630));
    const result = profile.map(data);
    expect(result.totalInCents).toBe(2500);
    expect(result.entries[1].amountInCents).toBe(-500);
  });

  it("preserva descontos de antecipação sem descontá-los do subtotal de compras", () => {
    const data = invoice();
    data.pages[1].items.push(
      ...row("11/06", "Desc Antecipa Parcelas", "-2,00", 133, 630),
      ...row("11/06", "Des c An tecipa Parce las", "-2,00", 133, 610),
    );
    const result = profile.map(data);
    expect(result.entries.filter(entry => entry.amountInCents < 0)).toHaveLength(2);
    expect(result.totalInCents).toBe(2600);
    data.pages[1].items.find(part => part.text === "30,00")!.text = "31,00";
    expect(() => profile.map(data)).toThrow(InvoiceTotalMismatchError);
  });

  it("rejeita divergência de total em vez de aceitar leitura parcial", () => {
    expect(() => profile.map(invoice("31,00"))).toThrow(InvoiceTotalMismatchError);
  });

  it.each(["", "10,00abc", "1.0,00"])("rejeita o valor inválido %j", invalidAmount => {
    const data = invoice();
    data.pages[1].items.find(part => part.text === "10,00")!.text = invalidAmount;
    expect(() => profile.map(data)).toThrow(InvoiceParseError);
  });

  it("rejeita datas impossíveis", () => {
    const data = invoice();
    data.pages[1].items.find(part => part.text === "10/06")!.text = "31/02";
    expect(() => profile.map(data)).toThrow(InvoiceParseError);
  });

  it("infere o ano anterior para compras de dezembro numa fatura de janeiro", () => {
    const data = invoice();
    data.pages[0].items[2].text = "Vencimento: 06/01/2027";
    data.pages[1].items.find(part => part.text === "10/06")!.text = "15/12";
    expect(profile.map(data).entries[0].occurredOn).toBe("2026-12-15");
  });

  it("não anexa a descrição da próxima compra à anterior", () => {
    const data = invoice("35,00");
    data.pages[1].items.push(...row("11/06", "OUTRA COMPRA", "5,00", 133, 650));
    expect(profile.map(data).entries[0].description).toBe("MERCADO ALFA");
  });

  it("rejeita um total atual ambíguo", () => {
    const data = invoice();
    data.pages[1].items.push(item("Total dos lançamentos atuais", 133, 600), item("30,00", 308, 600));
    expect(() => profile.map(data)).toThrow(/ambíguo/);
  });
});
