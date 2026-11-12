import { createHash } from "node:crypto";
import { LIMITE_DESCRICAO_MOVIMENTACAO } from "../../../models/descricaoMovimentacao.js";
import type { InvoiceImportService } from "./invoice-import-service.js";
import type { InvoiceImportRequest } from "../domain/invoice.js";
import { InvoiceParseError } from "../domain/invoice-errors.js";
import {
  InvoiceConfirmationUnavailableError, InvoicePreviewChangedError,
  InvoiceUserRequiredError, type ImportPreview, type InvoiceImportRepository,
} from "../domain/invoice-import-repository.js";

export class InvoiceImportWorkflow {
  constructor(
    private readonly reader: Pick<InvoiceImportService, "preview" | "getOptions">,
    private readonly repository?: InvoiceImportRepository,
  ) {}

  get canConfirm(): boolean { return this.repository !== undefined; }

  getOptions() { return this.reader.getOptions(); }

  async preview(request: InvoiceImportRequest): Promise<ImportPreview> {
    // O profile confere o total original do PDF antes de descartarmos estornos.
    const original = await this.reader.preview(request);
    const entries = original.entries.filter(entry => entry.amountInCents >= 0).map(entry => ({
      ...entry,
      // Não deixa metade de um caractere UTF-16 (como um emoji) na borda do corte.
      description: entry.description.slice(0, LIMITE_DESCRICAO_MOVIMENTACAO)
        .replace(/[\uD800-\uDBFF]$/, "").trimEnd(),
    }));
    if (entries.length === 0) {
      throw new InvoiceParseError("A fatura não possui lançamentos não negativos para importar.");
    }
    const totalInCents = entries.reduce((sum, entry) => sum + entry.amountInCents, 0);
    if (!Number.isSafeInteger(totalInCents)) {
      throw new InvoiceParseError("O total da fatura ultrapassa o limite de precisão.");
    }

    // A identidade é da fatura inteira. Ordenar não remove compras repetidas.
    // Nome de arquivo, senha, ordem das linhas e formatação monetária não fazem parte dela.
    // Usamos as descrições completas para preservar a identificação de importações anteriores.
    const canonicalEntries = original.entries.map(entry => JSON.stringify([
      entry.occurredOn, entry.description, entry.amountInCents,
    ])).sort();
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(["invoice-v1", canonicalEntries])).digest("hex");
    return {
      ...original, entries, totalInCents, fingerprint,
      ignoredNegativeCount: original.entries.length - entries.length,
    };
  }

  async confirm(userId: number, request: InvoiceImportRequest, expectedFingerprint: string) {
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new InvoiceUserRequiredError();
    if (!this.repository) throw new InvoiceConfirmationUnavailableError();
    // Não recebemos a lista de despesas do navegador: relemos a fonte e validamos novamente.
    const preview = await this.preview(request);
    if (preview.fingerprint !== expectedFingerprint) throw new InvoicePreviewChangedError();
    return this.repository.save(userId, preview);
  }
}
