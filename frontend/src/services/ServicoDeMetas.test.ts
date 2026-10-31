import { afterEach, describe, expect, it, vi } from "vitest";
import { ServicoDeMetas } from "./ServicoDeMetas";

afterEach(() => vi.unstubAllGlobals());
const meta = { name: "Viagem", targetAmountInCents: 100, progressAmountInCents: 0 };

describe("ServicoDeMetas", () => {
  it("consulta e envia os centavos para a rota configurada", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([meta])))
      .mockResolvedValueOnce(new Response(JSON.stringify(meta), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const servico = new ServicoDeMetas();
    expect(await servico.listar()).toEqual([meta]);
    const dados = { name: meta.name, targetAmountInCents: 100 };
    expect(await servico.cadastrar(dados)).toEqual(meta);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/goals", expect.objectContaining({ method: "POST", body: JSON.stringify(dados) }));
  });
  it.each([400, 409, 500])("propaga erro HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: { mensagem: "Falha ao cadastrar" } }), { status })));
    await expect(new ServicoDeMetas().cadastrar(meta)).rejects.toThrow("Falha ao cadastrar");
  });
  it("trata erro sem JSON e falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("Erro", { status: 500 }))
      .mockRejectedValueOnce(new Error("Sem rede")));
    await expect(new ServicoDeMetas().listar()).rejects.toThrow("Não foi possível");
    await expect(new ServicoDeMetas().cadastrar(meta)).rejects.toThrow("Sem rede");
  });
  it("rejeita respostas de sucesso inválidas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("{}")));
    await expect(new ServicoDeMetas().listar()).rejects.toThrow("Resposta inválida");
    await expect(new ServicoDeMetas().cadastrar(meta)).rejects.toThrow("Resposta inválida");
  });
});
