import type { InvoiceFile } from "../../../domain/invoice.js";
import {
  InvalidInvoiceFileError,
  InvalidInvoicePasswordError,
  InvoicePasswordRequiredError,
} from "../../../domain/invoice-errors.js";
import type {
  ExtractedPdfInvoiceData,
  ExtractedPdfPage,
  InvoiceExtractor,
} from "../../../domain/invoice-extractor.js";

/**
 * Extractor de PDFs enviados para bancos conhecidos.
 *
 * Converte bytes e senha opcional em textos posicionados por página. Não
 * interpreta lançamentos, não identifica bancos e não participa do CSV manual.
 */

export class PdfInvoiceExtractor implements InvoiceExtractor {
  readonly format = "pdf" as const;

  async extract(file: InvoiceFile): Promise<ExtractedPdfInvoiceData> {
    // A importação dinâmica carrega a biblioteca somente durante leituras PDF.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: file.content.slice(),
      password: file.password,
    });

    try {
      const document = await loadingTask.promise;
      const pages: ExtractedPdfPage[] = [];

      // PDF.js devolve fragmentos visuais. As coordenadas são preservadas
      // porque colunas visuais não formam necessariamente uma tabela no PDF.
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent();
        const items = textContent.items
          .filter((item) => "str" in item && item.str.trim() !== "")
          .map((item) => {
            if (!("str" in item)) {
              throw new InvalidInvoiceFileError(
                "O PDF possui um item de texto inesperado",
              );
            }

            return {
              text: item.str.trim(),
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height,
            };
          });

        pages.push({
          pageNumber,
          width: viewport.width,
          height: viewport.height,
          items,
        });
        page.cleanup();
      }

      return { format: "pdf", pages };
    } catch (error: unknown) {
      if (isPasswordError(error, pdfjs.PasswordResponses.NEED_PASSWORD)) {
        throw new InvoicePasswordRequiredError();
      }

      if (isPasswordError(error, pdfjs.PasswordResponses.INCORRECT_PASSWORD)) {
        throw new InvalidInvoicePasswordError();
      }

      if (
        error instanceof InvoicePasswordRequiredError ||
        error instanceof InvalidInvoicePasswordError
      ) {
        throw error;
      }

      throw new InvalidInvoiceFileError("Não foi possível extrair o PDF da fatura");
    } finally {
      // A liberação ocorre no sucesso e no erro; nenhum estado do documento ou
      // da senha é mantido pelo extractor após a chamada.
      await loadingTask.destroy();
    }
  }
}

function isPasswordError(error: unknown, expectedCode: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "PasswordException" &&
    "code" in error &&
    error.code === expectedCode
  );
}
