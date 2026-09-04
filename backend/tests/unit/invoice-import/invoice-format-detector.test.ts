import { describe, expect, it } from "vitest";

import {
  InvalidInvoiceFileError,
  UnsupportedInvoiceFormatError,
} from "../../../src/features/invoice-import/domain/invoice-errors.js";
import { CsvInvoiceExtractor } from "../../../src/features/invoice-import/infrastructure/extractors/csv/csv-invoice-extractor.js";
import { InvoiceFormatDetector } from "../../../src/features/invoice-import/infrastructure/format-detection/invoice-format-detector.js";

const encode = (content: string): Uint8Array => new TextEncoder().encode(content);

describe("InvoiceFormatDetector", () => {
  const detector = new InvoiceFormatDetector();

  it("detects PDF by its binary signature instead of its extension", () => {
    expect(
      detector.detect({ fileName: "fatura.dat", content: encode("%PDF-1.7") }),
    ).toBe("pdf");
  });

  it("detects delimited text as CSV", () => {
    expect(
      detector.detect({
        fileName: "fatura.txt",
        content: encode("data;descricao;valor\n2026-09-03;Mercado;10,00"),
      }),
    ).toBe("csv");
  });

  it("rejects a file whose content does not match its declared format", () => {
    expect(() =>
      detector.detect({
        fileName: "fatura.pdf",
        mimeType: "application/pdf",
        content: encode("isto não é um PDF"),
      }),
    ).toThrow(InvalidInvoiceFileError);
  });

  it("rejects an unknown binary format", () => {
    expect(() =>
      detector.detect({
        fileName: "fatura.bin",
        content: new Uint8Array([0xff, 0xfe, 0xfd]),
      }),
    ).toThrow(UnsupportedInvoiceFormatError);
  });

  it("decodes legacy Windows-1252 CSV exported by a bank", async () => {
    const beforeCedilla = encode("data;descri");
    const afterCedilla = encode("o;valor\n2026-09-03;Mercado;10,00");
    const content = new Uint8Array([
      ...beforeCedilla,
      0xe7,
      0xe3,
      ...afterCedilla,
    ]);

    const extracted = await new CsvInvoiceExtractor().extract({
      fileName: "fatura.csv",
      content,
    });

    expect(extracted.encoding).toBe("windows-1252");
    expect(extracted.header).toEqual(["data", "descrição", "valor"]);
  });
});
