import { describe, expect, it, vi } from "vitest";
import { InvoiceImportWorkflow } from "../../../src/features/invoice-import/application/invoice-import-workflow.js";
import { InvoiceParseError } from "../../../src/features/invoice-import/domain/invoice-errors.js";
import { InvoicePreviewChangedError, InvoiceUserRequiredError } from "../../../src/features/invoice-import/domain/invoice-import-repository.js";
import type { InvoicePreview } from "../../../src/features/invoice-import/domain/invoice.js";

const request = { mode: "template" as const, content: "conteúdo recebido" };
const original: InvoicePreview = {
  source: { mode: "template", format: "csv", profileId: "standard-template-v1" },
  entries: [
    { occurredOn: "2026-11-08", description: "Mercado", amountInCents: 1000 },
    { occurredOn: "2026-11-08", description: "Estorno", amountInCents: -200 },
  ], totalInCents: 800,
};
function setup() {
  const reader = { preview: vi.fn().mockResolvedValue(original), getOptions: vi.fn() };
  const repository = { save: vi.fn().mockReturnValue({ importId: 1, importedCount: 1, totalInCents: 1000 }) };
  return { reader, repository, workflow: new InvoiceImportWorkflow(reader, repository) };
}
describe("InvoiceImportWorkflow", () => {
  it("confirma a mesma descrição reduzida apresentada na prévia", async () => {
    const { workflow, reader, repository } = setup();
    const description = "Cristiano Ronaldo ".padEnd(240, "x");
    reader.preview.mockResolvedValue({ ...original, entries: [{ ...original.entries[0], description }] });
    const preview = await workflow.preview(request);
    await workflow.confirm(7, request, preview.fingerprint);
    expect(repository.save).toHaveBeenCalledExactlyOnceWith(7, preview);
    expect(preview.entries[0].description).toBe(description.slice(0, 200));
  });

  it("descarta negativos após a leitura, recalcula o total e não salva na prévia", async () => {
    const { workflow, reader, repository } = setup();
    const result = await workflow.preview(request);
    expect(result.entries).toEqual([original.entries[0]]);
    expect(result.totalInCents).toBe(1000);
    expect(result.ignoredNegativeCount).toBe(1);
    expect(reader.preview).toHaveBeenCalledWith(request);
    expect(repository.save).not.toHaveBeenCalled();
    expect(original.entries).toHaveLength(2);
  });
  it("identifica a fatura inteira sem eliminar compras legítimas iguais", async () => {
    const { workflow, reader } = setup();
    const first = await workflow.preview(request);
    reader.preview.mockResolvedValue({ ...original, entries: [...original.entries].reverse() });
    expect((await workflow.preview(request)).fingerprint).toBe(first.fingerprint);
    reader.preview.mockResolvedValue({ ...original, entries: [original.entries[0], original.entries[0]] });
    const repeated = await workflow.preview(request);
    expect(repeated.entries).toHaveLength(2);
    expect(repeated.totalInCents).toBe(2000);
    expect(repeated.fingerprint).not.toBe(first.fingerprint);
  });
  it("revalida a fonte antes de confirmar e repassa o usuário ao repositório", async () => {
    const { workflow, reader, repository } = setup();
    const preview = await workflow.preview(request);
    await expect(workflow.confirm(7, request, preview.fingerprint)).resolves.toMatchObject({ importId: 1 });
    expect(reader.preview).toHaveBeenCalledTimes(2);
    expect(repository.save).toHaveBeenCalledExactlyOnceWith(7, preview);
  });
  it("recusa fonte alterada desde a prévia sem gravar", async () => {
    const { workflow, repository } = setup();
    await expect(workflow.confirm(7, request, "outro hash")).rejects.toThrow(InvoicePreviewChangedError);
    expect(repository.save).not.toHaveBeenCalled();
  });
  it("recusa usuário inválido antes da leitura", async () => {
    const { workflow, reader } = setup();
    await expect(workflow.confirm(0, request, "hash")).rejects.toThrow(InvoiceUserRequiredError);
    expect(reader.preview).not.toHaveBeenCalled();
  });
  it("propaga falha do leitor sem acionar o banco", async () => {
    const { workflow, reader, repository } = setup();
    reader.preview.mockRejectedValue(new InvoiceParseError("CSV vazio"));
    await expect(workflow.preview(request)).rejects.toThrow("CSV vazio");
    expect(repository.save).not.toHaveBeenCalled();
  });
  it("recusa fatura composta apenas por negativos", async () => {
    const { workflow, reader } = setup();
    reader.preview.mockResolvedValue({ ...original, entries: [original.entries[1]] });
    await expect(workflow.preview(request)).rejects.toThrow(InvoiceParseError);
  });
  it("recusa soma fora da precisão segura", async () => {
    const { workflow, reader } = setup();
    reader.preview.mockResolvedValue({ ...original, entries: [
      { ...original.entries[0], amountInCents: Number.MAX_SAFE_INTEGER }, original.entries[0],
    ] });
    await expect(workflow.preview(request)).rejects.toThrow("precisão");
  });
  it("propaga falha da persistência sem anunciar sucesso", async () => {
    const { workflow, repository } = setup();
    const preview = await workflow.preview(request);
    repository.save.mockImplementation(() => { throw new Error("banco indisponível"); });
    await expect(workflow.confirm(7, request, preview.fingerprint)).rejects.toThrow("banco indisponível");
  });
});
