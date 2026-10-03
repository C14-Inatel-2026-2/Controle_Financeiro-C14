import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ServicoDeCadastro } from "./ServicoDeCadastro";

const dados = {
  nome: "Donatto",
  email: "donatto@email.com",
  senha: "12345678",
};

describe("ServicoDeCadastro", () => {
  let servico: ServicoDeCadastro;

  // Instância nova a cada teste, para um não interferir no outro.
  beforeEach(() => {
    servico = new ServicoDeCadastro();
  });

  // Devolve o fetch verdadeiro no fim de cada teste.
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envia os dados para a API e devolve o usuário criado", async () => {
    // vi.fn() cria uma função falsa que anota tudo o que recebe.
    const fetchFalso = vi.fn().mockResolvedValue({
      ok: true,
      status: 201, // 201 = criado com sucesso
      json: async () => ({ id: 1, nome: "Donatto", email: "donatto@email.com" }),
    });

    // Troca o fetch de verdade pelo falso só durante este teste.
    vi.stubGlobal("fetch", fetchFalso);

    const usuario = await servico.cadastrar(dados);

    // 1) Devolveu o que a API respondeu?
    expect(usuario).toEqual({ id: 1, nome: "Donatto", email: "donatto@email.com" });

    // 2) Chamou a API uma vez só?
    expect(fetchFalso).toHaveBeenCalledTimes(1);

    // 3) Enviou para onde e com o quê?
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe("/api/users");
    expect(opcoes.method).toBe("POST");
    expect(JSON.parse(opcoes.body)).toEqual(dados);
  });

  // Teste negativo: e-mail duplicado.
  it("avisa quando o e-mail já está cadastrado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409 }));

    await expect(servico.cadastrar(dados)).rejects.toThrow(
      "Este e-mail já está cadastrado.",
    );
  });

  // Teste negativo: erro inesperado do servidor.
  it("avisa quando a API falha", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(servico.cadastrar(dados)).rejects.toThrow(
      "Não foi possível cadastrar",
    );
  });
});
