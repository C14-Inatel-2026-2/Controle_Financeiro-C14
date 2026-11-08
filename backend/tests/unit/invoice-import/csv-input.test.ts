import { describe, expect, it } from "vitest";
import { CsvInvoiceExtractor } from "../../../src/features/invoice-import/infrastructure/extractors/csv/csv-invoice-extractor.js";
import { createStandardTemplateProfile } from "../../../src/features/invoice-import/templates/standard-invoice-template.js";
import { InvoiceParseError } from "../../../src/features/invoice-import/domain/invoice-errors.js";

describe("Extractor CSV sem mocks", () => {
  it("separa cabeçalho e linhas de conteúdo válido", async () => {
    const result = await new CsvInvoiceExtractor().extract({ fileName: "manual.csv", content: new TextEncoder().encode("data;descricao;valor\n2026-11-08;Mercado;10,00") });
    expect(result).toMatchObject({ format: "csv", header: ["data", "descricao", "valor"], rows: [["2026-11-08", "Mercado", "10,00"]] });
  });
  it.each(["", "   "])("rejeita conteúdo vazio %j", async content => {
    await expect(new CsvInvoiceExtractor().extract({ fileName: "manual.csv", content: new TextEncoder().encode(content) })).rejects.toThrow(InvoiceParseError);
  });
});
describe("Profile CSV sem mocks", () => {
  it.each(["", "abc", "1.2.3"])("rejeita valor inválido %j na coluna financeira", value => {
    expect(() => createStandardTemplateProfile().map({
      format: "csv", encoding: "utf-8", header: ["data", "descricao", "valor"],
      rows: [["2026-11-08", "Mercado", value]],
    })).toThrow(InvoiceParseError);
  });
});
