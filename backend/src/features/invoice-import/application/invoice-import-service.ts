import type {
  InvoiceFormat,
  InvoiceImportOptions,
  InvoiceImportRequest,
  InvoicePreview,
} from "../domain/invoice.js";
import { CsvInvoiceExtractor } from "../infrastructure/extractors/csv/csv-invoice-extractor.js";
import {
  InvoiceExtractorNotConfiguredError,
  InvoiceParseError,
} from "../domain/invoice-errors.js";
import type { InvoiceExtractor } from "../domain/invoice-extractor.js";
import { InvoiceFormatDetector } from "../infrastructure/format-detection/invoice-format-detector.js";
import type { InvoiceProfile } from "../domain/invoice-profile.js";
import { InvoiceProfileRegistry } from "../domain/invoice-profile-registry.js";
import {
  AI_TEMPLATE_PROMPT,
  AI_USAGE_NOTICE,
  createStandardTemplateProfile,
  STANDARD_INVOICE_TEMPLATE,
} from "../templates/standard-invoice-template.js";

/**
 * Caso de uso que coordena a importação de banco conhecido e de CSV manual.
 *
 * Regras de PDF, CSV e layouts bancários permanecem nos componentes
 * especializados recebidos como dependências.
 */

interface InvoiceImportServiceDependencies {
  detector: InvoiceFormatDetector;
  extractors: readonly InvoiceExtractor[];
  profiles: InvoiceProfileRegistry;
  templateProfile: InvoiceProfile;
}

export class InvoiceImportService {
  constructor(private readonly dependencies: InvoiceImportServiceDependencies) {}

  getOptions(): InvoiceImportOptions {
    // Centraliza as opções de importação para evitar configuração duplicada
    // entre backend e interface de usuário.
    return {
      knownBanks: this.dependencies.profiles.listKnownBanks(
        this.availableFormats(),
      ),
      customTemplate: {
        id: "template",
        label: "Outro banco",
        example: STANDARD_INVOICE_TEMPLATE,
        aiUsageNotice: AI_USAGE_NOTICE,
        aiPrompt: AI_TEMPLATE_PROMPT,
      },
    };
  }

  async preview(request: InvoiceImportRequest): Promise<InvoicePreview> {
    if (request.mode === "template") {
      return this.previewTemplate(request.content);
    }

    // A validação ocorre antes da extração para evitar abrir arquivos de bancos
    // desconhecidos ou em formatos não cadastrados para o banco selecionado.
    this.dependencies.profiles.assertKnownBank(request.bankId);
    const format = this.dependencies.detector.detect(request.file);
    this.dependencies.profiles.assertSupportedFormat(request.bankId, format);
    const extractedData = await this.findExtractor(format).extract(request.file);
    const profile = this.dependencies.profiles.resolve(
      request.bankId,
      extractedData,
    );
    const parsedInvoice = profile.map(extractedData);

    return {
      ...parsedInvoice,
      source: {
        mode: "known-bank",
        bankId: request.bankId,
        format,
        profileId: profile.id,
      },
    };
  }

  private async previewTemplate(content: string): Promise<InvoicePreview> {
    // A entrada manual possui formato previamente definido. Por isso, não usa
    // detector nem registry de bancos e segue diretamente para o extractor CSV.
    const file = {
      fileName: "template.csv",
      mimeType: "text/csv",
      content: new TextEncoder().encode(content),
    };
    const extractedData = await this.findExtractor("csv").extract(file);

    // O marcador "ERRO" indica conteúdo incerto e bloqueia a pré-visualização
    // até que a linha seja revisada.
    if (
      extractedData.format === "csv" &&
      extractedData.rows.some((row) =>
        row.some((value) => value.trim().toLowerCase() === "erro"),
      )
    ) {
      throw new InvoiceParseError(
        "O template possui informação marcada como ERRO e precisa ser revisado",
      );
    }

    const parsedInvoice = this.dependencies.templateProfile.map(extractedData);

    return {
      ...parsedInvoice,
      source: {
        mode: "template",
        format: "csv",
        profileId: this.dependencies.templateProfile.id,
      },
    };
  }

  private findExtractor(format: InvoiceFormat): InvoiceExtractor {
    const extractor = this.dependencies.extractors.find(
      (candidate) => candidate.format === format,
    );

    if (!extractor) {
      throw new InvoiceExtractorNotConfiguredError(format);
    }

    return extractor;
  }

  private availableFormats(): InvoiceFormat[] {
    return this.dependencies.extractors.map((extractor) => extractor.format);
  }
}

export function createInvoiceImportService(
  profiles: readonly InvoiceProfile[] = [],
  extractors: readonly InvoiceExtractor[] = [new CsvInvoiceExtractor()],
): InvoiceImportService {
  // Factory básica usada nos testes e na montagem da configuração de produção.
  return new InvoiceImportService({
    detector: new InvoiceFormatDetector(),
    extractors,
    profiles: new InvoiceProfileRegistry(profiles),
    templateProfile: createStandardTemplateProfile(),
  });
}
