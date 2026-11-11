import { afterEach, describe, expect, it, vi } from "vitest";
import { prepararPdf, ServicoDeImportacao } from "./ServicoDeImportacao";
import { SessaoExpiradaError } from "./ServicoDeAutenticacao";

afterEach(() => vi.unstubAllGlobals());
describe("ServicoDeImportacao com rede simulada", () => {
  it("consulta as opções oferecidas pelo backend", async () => {
    const options = { knownBanks: [{ id: "itau" }] };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => options });
    vi.stubGlobal("fetch", fetchMock);
    expect(await new ServicoDeImportacao().options()).toEqual(options);
    expect(fetchMock).toHaveBeenCalledWith("/api/invoice-imports/options", undefined);
  });
  it("reenvia a fonte e o fingerprint para confirmar, sem lista de despesas ou ID de usuário", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ importId: 12 }) });
    vi.stubGlobal("fetch", fetchMock);
    const source = { mode: "template" as const, content: "data;descricao;valor" };
    await new ServicoDeImportacao().confirm(source, "hash");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/invoice-imports/confirm");
    expect(JSON.parse(init.body)).toEqual({ ...source, fingerprint: "hash" });
  });
  it("apresenta a mensagem de rejeição do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ erro: { mensagem: "Fatura duplicada" } }) }));
    await expect(new ServicoDeImportacao().preview({ mode: "template", content: "CSV" })).rejects.toThrow("Fatura duplicada");
  });
  it("indica sessão expirada quando a confirmação responde 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    await expect(new ServicoDeImportacao().confirm({ mode: "template", content: "CSV" }, "hash"))
      .rejects.toBeInstanceOf(SessaoExpiradaError);
  });
  it("trata resposta de erro que não seja JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error("HTML"); } }));
    await expect(new ServicoDeImportacao().options()).rejects.toThrow("Não foi possível processar");
  });
  it("propaga falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Sem conexão")));
    await expect(new ServicoDeImportacao().options()).rejects.toThrow("Sem conexão");
  });
});
describe("Preparação do PDF sem rede", () => {
  it("converte os bytes em base64 e inclui senha somente se informada", async () => {
    const source = await prepararPdf(new File(["%PDF-"], "sintetico.pdf", { type: "application/pdf" }), "itau", "", 1024);
    expect(source).toEqual({ mode: "known-bank", bankId: "itau", file: {
      fileName: "sintetico.pdf", mimeType: "application/pdf", base64: "JVBERi0=",
    } });
  });
  it("recusa arquivo vazio antes de ler", async () => {
    await expect(prepararPdf(new File([], "vazio.pdf"), "itau", "", 1024)).rejects.toThrow("não vazio");
  });
  it("recusa arquivo maior que o limite", async () => {
    await expect(prepararPdf(new File(["12345"], "grande.pdf"), "itau", "", 4)).rejects.toThrow("5 MiB");
  });
});
