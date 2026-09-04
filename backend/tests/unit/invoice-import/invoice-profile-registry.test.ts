import { describe, expect, it } from "vitest";

import { ConfigurableCsvProfile } from "../../../src/features/invoice-import/infrastructure/profiles/csv/configurable-csv-profile.js";
import {
  AmbiguousInvoiceLayoutError,
  UnknownInvoiceLayoutError,
  UnsupportedBankError,
  UnsupportedBankFormatError,
} from "../../../src/features/invoice-import/domain/invoice-errors.js";
import type { ExtractedCsvInvoiceData } from "../../../src/features/invoice-import/domain/invoice-extractor.js";
import type { InvoiceProfile } from "../../../src/features/invoice-import/domain/invoice-profile.js";
import { InvoiceProfileRegistry } from "../../../src/features/invoice-import/domain/invoice-profile-registry.js";

// Fixture isolada para testar o registry; não integra o catálogo da aplicação.

const exampleBankCsv = new ConfigurableCsvProfile({
  id: "example-bank-csv-v1",
  bankId: "example-bank",
  bankName: "Banco Exemplo",
  version: "1",
  columns: {
    occurredOn: ["data da compra"],
    description: ["estabelecimento"],
    amountInCents: ["valor (r$)"],
  },
  acceptedDateFormats: ["pt-BR"],
  amountFormat: "pt-BR",
});

const exampleBankData: ExtractedCsvInvoiceData = {
  format: "csv",
  encoding: "utf-8",
  delimiter: ";",
  header: ["Data da compra", "Estabelecimento", "Valor (R$)"],
  rows: [["03/09/2026", "Mercado", "10,00"]],
};

describe("InvoiceProfileRegistry", () => {
  it("lists only banks whose format has a configured extractor", () => {
    const pdfProfile: InvoiceProfile = {
      id: "nubank-pdf-v1",
      bankId: "nubank",
      bankName: "Nubank",
      format: "pdf",
      version: "1",
      priority: 0,
      matches: () => true,
      map: () => ({ entries: [], totalInCents: 0 }),
    };
    const registry = new InvoiceProfileRegistry([exampleBankCsv, pdfProfile]);

    expect(registry.listKnownBanks(["csv"])).toEqual([
      { id: "example-bank", name: "Banco Exemplo", formats: ["csv"] },
    ]);
  });

  it("resolves the profile matching bank, format and layout", () => {
    const registry = new InvoiceProfileRegistry([exampleBankCsv]);

    expect(registry.resolve("example-bank", exampleBankData).id).toBe(
      "example-bank-csv-v1",
    );
  });

  it("rejects a bank without profiles", () => {
    const registry = new InvoiceProfileRegistry([exampleBankCsv]);

    expect(() => registry.resolve("unknown", exampleBankData)).toThrow(
      UnsupportedBankError,
    );
  });

  it("distinguishes unsupported formats from unknown layouts", () => {
    const registry = new InvoiceProfileRegistry([exampleBankCsv]);

    expect(() =>
      registry.resolve("example-bank", {
        ...exampleBankData,
        format: "csv",
        header: ["data", "descricao", "valor"],
      }),
    ).toThrow(UnknownInvoiceLayoutError);

    const pdfData = {
      format: "pdf" as const,
      pages: [
        { pageNumber: 1, width: 595, height: 842, items: [] },
      ],
    };
    expect(() => registry.resolve("example-bank", pdfData)).toThrow(
      UnsupportedBankFormatError,
    );
  });

  it("rejects profiles with the same matching priority", () => {
    const duplicateProfile = new ConfigurableCsvProfile({
      id: "example-bank-csv-v2",
      bankId: "example-bank",
      bankName: "Banco Exemplo",
      version: "2",
      columns: {
        occurredOn: ["data da compra"],
        description: ["estabelecimento"],
        amountInCents: ["valor (r$)"],
      },
      acceptedDateFormats: ["pt-BR"],
      amountFormat: "pt-BR",
    });
    const registry = new InvoiceProfileRegistry([
      exampleBankCsv,
      duplicateProfile,
    ]);

    expect(() => registry.resolve("example-bank", exampleBankData)).toThrow(
      AmbiguousInvoiceLayoutError,
    );
  });
});
