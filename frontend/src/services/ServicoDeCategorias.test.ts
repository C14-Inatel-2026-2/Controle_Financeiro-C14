import { afterEach, describe, expect, it, vi } from "vitest";
import { ServicoDeCategorias } from "./ServicoDeCategorias";

afterEach(() => vi.unstubAllGlobals());

describe("ServicoDeCategorias", () => {
  it("lista as categorias da API", async () => {
    const lista = [{ id: 1, name: "Lazer" }];
    const fetchFalso = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => lista });
    vi.stubGlobal("fetch", fetchFalso);

    expect(await new ServicoDeCategorias().listar()).toEqual(lista);
    expect(fetchFalso).toHaveBeenCalledWith("/api/categories", undefined);
  });

  it("envia só o nome ao criar, sem ID de usuário", async () => {
    const fetchFalso = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 2, name: "Saúde" }) });
    vi.stubGlobal("fetch", fetchFalso);

    expect(await new ServicoDeCategorias().criar("Saúde")).toEqual({ id: 2, name: "Saúde" });
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe("/api/categories");
    expect(opcoes.method).toBe("POST");
    expect(JSON.parse(opcoes.body)).toEqual({ name: "Saúde" });
  });

  it("mostra a mensagem do servidor para nome repetido", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 409, json: async () => ({ erro: { mensagem: "A categoria Lazer já está cadastrada" } }),
    }));
    await expect(new ServicoDeCategorias().criar("Lazer")).rejects.toThrow("A categoria Lazer já está cadastrada");
  });

  it("pede login quando a sessão não existe", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    await expect(new ServicoDeCategorias().listar()).rejects.toThrow("Faça login para ver suas categorias.");
  });

  it("avisa em português quando a API está fora do ar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(new ServicoDeCategorias().listar()).rejects.toThrow("Não foi possível carregar as categorias.");
  });
});
