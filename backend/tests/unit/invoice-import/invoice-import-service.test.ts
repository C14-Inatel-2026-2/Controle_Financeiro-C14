import { describe, expect, it } from "vitest";

import { ConfigurableCsvProfile } from "../../../src/features/invoice-import/infrastructure/profiles/csv/configurable-csv-profile.js";
import {
  InvoiceParseError,
  UnknownInvoiceLayoutError,
  UnsupportedBankError,
  UnsupportedBankFormatError,
} from "../../../src/features/invoice-import/domain/invoice-errors.js";
import { createInvoiceImportService } from "../../../src/features/invoice-import/application/invoice-import-service.js";

const encode = (content: string): Uint8Array => new TextEncoder().encode(content);

// Profile sintético usado para isolar a orquestração do serviço nos testes.
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

describe("InvoiceImportService", () => {
  it("returns bank options from profiles that can actually be processed", () => {
    const service = createInvoiceImportService([exampleBankCsv]);

    expect(service.getOptions().knownBanks).toEqual([
      { id: "example-bank", name: "Banco Exemplo", formats: ["csv"] },
    ]);
    expect(service.getOptions().customTemplate).toMatchObject({
      id: "template",
      label: "Outro banco",
    });
    expect(service.getOptions().customTemplate.aiUsageNotice).toContain(
      "remova nome, CPF",
    );
  });

  it("previews a known bank file using the matching profile", async () => {
    const service = createInvoiceImportService([exampleBankCsv]);
    const content = [
      "Data da compra;Estabelecimento;Valor (R$)",
      '02/09/2026;"Mercado, bairro";1.234,56',
      "03/09/2026;Estorno;(10,50)",
    ].join("\n");

    const preview = await service.preview({
      mode: "known-bank",
      bankId: "example-bank",
      file: {
        fileName: "fatura.csv",
        mimeType: "text/csv",
        content: encode(content),
      },
    });

    expect(preview).toEqual({
      entries: [
        {
          occurredOn: "2026-09-02",
          description: "Mercado, bairro",
          amountInCents: 123456,
        },
        {
          occurredOn: "2026-09-03",
          description: "Estorno",
          amountInCents: -1050,
        },
      ],
      totalInCents: 122406,
      source: {
        mode: "known-bank",
        bankId: "example-bank",
        format: "csv",
        profileId: "example-bank-csv-v1",
      },
    });
  });

  it("rejects a known bank file with an unrecognized layout", async () => {
    const service = createInvoiceImportService([exampleBankCsv]);
    const genericCsv = "data;descricao;valor\n2026-09-03;Mercado;10,00";

    await expect(
      service.preview({
        mode: "known-bank",
        bankId: "example-bank",
        file: { fileName: "fatura.csv", content: encode(genericCsv) },
      }),
    ).rejects.toThrow(UnknownInvoiceLayoutError);
  });

  it("rejects an unknown bank before inspecting the file", async () => {
    const service = createInvoiceImportService([exampleBankCsv]);

    await expect(
      service.preview({
        mode: "known-bank",
        bankId: "unknown",
        file: { fileName: "empty.pdf", content: new Uint8Array() },
      }),
    ).rejects.toThrow(UnsupportedBankError);
  });

  it("rejects a format not configured for the selected bank before extraction", async () => {
    const service = createInvoiceImportService([exampleBankCsv]);

    await expect(
      service.preview({
        mode: "known-bank",
        bankId: "example-bank",
        file: { fileName: "fatura.pdf", content: encode("%PDF-1.7") },
      }),
    ).rejects.toThrow(UnsupportedBankFormatError);
  });

  it("previews standardized text for another bank", async () => {
    const service = createInvoiceImportService();

    const preview = await service.preview({
      mode: "template",
      content: [
        "data;descricao;valor",
        "2026-09-02;Mercado;125,90",
        "2026-09-03;Estorno;-20,00",
      ].join("\n"),
    });

    expect(preview).toEqual({
      entries: [
        {
          occurredOn: "2026-09-02",
          description: "Mercado",
          amountInCents: 12590,
        },
        {
          occurredOn: "2026-09-03",
          description: "Estorno",
          amountInCents: -2000,
        },
      ],
      totalInCents: 10590,
      source: {
        mode: "template",
        format: "csv",
        profileId: "standard-template-v1",
      },
    });
  });

  it("requires the exact date convention in standardized text", async () => {
    const service = createInvoiceImportService();

    await expect(
      service.preview({
        mode: "template",
        content: "data;descricao;valor\n03/09/2026;Mercado;10,00",
      }),
    ).rejects.toThrow(InvoiceParseError);
  });

  it("rejects impossible calendar dates in standardized text", async () => {
    const service = createInvoiceImportService();

    await expect(
      service.preview({
        mode: "template",
        content: "data;descricao;valor\n2026-02-31;Mercado;10,00",
      }),
    ).rejects.toThrow("Data inválida na linha 2");
  });

  it("rejects malformed quoted text", async () => {
    const service = createInvoiceImportService();

    await expect(
      service.preview({
        mode: "template",
        content: 'data;descricao;valor\n2026-09-03;"Mercado;10,00',
      }),
    ).rejects.toThrow("aspas não fechadas");
  });

  it("requires review when AI leaves a field marked as uncertain", async () => {
    const service = createInvoiceImportService();

    await expect(
      service.preview({
        mode: "template",
        content: "data;descricao;valor\n2026-09-03;ERRO;10,00",
      }),
    ).rejects.toThrow("precisa ser revisado");
  });
});
