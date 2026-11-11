import { afterEach, describe, expect, it, vi } from "vitest";
import { ServicoDeAutenticacao } from "./ServicoDeAutenticacao";

afterEach(() => vi.unstubAllGlobals());

const usuario = { id: 1, nome: "Ana Teste", email: "ana@email.com" };

describe("ServicoDeAutenticacao com rede simulada", () => {
  it("envia e-mail e senha ao login e devolve o usuário", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => usuario });
    vi.stubGlobal("fetch", fetchFalso);

    expect(await new ServicoDeAutenticacao().entrar("ana@email.com", "segredo")).toEqual(usuario);
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe("/api/auth/login");
    expect(opcoes.method).toBe("POST");
    expect(JSON.parse(opcoes.body)).toEqual({ email: "ana@email.com", senha: "segredo" });
  });

  it("mostra a mensagem da API para credenciais inválidas", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401, json: async () => ({ erro: { codigo: "INVALID_CREDENTIALS", mensagem: "E-mail ou senha incorretos." } }),
    }));
    await expect(new ServicoDeAutenticacao().entrar("x@x.com", "x")).rejects.toThrow("E-mail ou senha incorretos.");
  });

  it("avisa em português quando a API está fora do ar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(new ServicoDeAutenticacao().entrar("x@x.com", "x")).rejects.toThrow("Não foi possível entrar. Tente novamente.");
  });

  it("devolve o usuário da sessão ou null quando não há sessão", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => usuario })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }));
    const servico = new ServicoDeAutenticacao();
    expect(await servico.usuarioAtual()).toEqual(usuario);
    expect(await servico.usuarioAtual()).toBeNull();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("/api/auth/me");
  });

  it("chama o logout e falha se a API não confirmar", async () => {
    const fetchFalso = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 204 })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchFalso);
    const servico = new ServicoDeAutenticacao();
    await servico.sair();
    expect(fetchFalso).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    await expect(servico.sair()).rejects.toThrow("Não foi possível sair.");
  });
});
