import { afterEach, describe, expect, it, vi } from "vitest";
import { ServicoDeMetas } from "./ServicoDeMetas";
import { SessaoExpiradaError } from "./ServicoDeAutenticacao";

afterEach(() => vi.unstubAllGlobals());
describe("API de metas", () => {
  it("lista, cria e aporta na mesma origem sem enviar proprietário", async () => {
    const meta = { id: 7, name: "Viagem", targetAmountInCents: 100, progressAmountInCents: 10 };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => meta });
    vi.stubGlobal("fetch", fetchMock);
    const api = new ServicoDeMetas();
    await api.listar(); await api.criar("Viagem", 100);
    expect(await api.aportar(7, 10)).toEqual(meta);
    expect(fetchMock.mock.calls[0]).toEqual(["/api/goals", { credentials: "same-origin" }]);
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ name: "Viagem", targetAmountInCents: 100 }));
    expect(fetchMock.mock.calls[2]).toEqual(["/api/goals/7/contributions", {
      credentials: "same-origin", method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountInCents: 10 }),
    }]);
  });
  it("transforma 401 em sessão expirada", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401 }));
    await expect(new ServicoDeMetas().listar()).rejects.toThrow(SessaoExpiradaError);
  });
  it("preserva mensagem de erro da API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 409, ok: false, json: async () => ({ erro: { mensagem: "Limite atingido" } }) }));
    await expect(new ServicoDeMetas().aportar(1, 1)).rejects.toThrow("Limite atingido");
  });
  it("trata falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    await expect(new ServicoDeMetas().listar()).rejects.toThrow("Não foi possível conectar");
  });
  it("trata resposta sem JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => { throw new Error(); } }));
    await expect(new ServicoDeMetas().listar()).rejects.toThrow("Não foi possível concluir");
  });
});
