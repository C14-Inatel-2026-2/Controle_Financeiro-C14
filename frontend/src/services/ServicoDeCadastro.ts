import type { DadosCadastro } from "../utils/ValidadorDeCadastro";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
};

/** Conversa com a API de usuários. Depende da rede, então testa com mock. */
export class ServicoDeCadastro {
  private readonly baseUrl: string;

  // O endereço da API é configurável: facilita apontar para outro servidor.
  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  async cadastrar(dados: DadosCadastro): Promise<Usuario> {
    const resposta = await fetch(`${this.baseUrl}/users`, {
      method: "POST", // POST = estou enviando dados
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados), // objeto -> texto, que é o que trafega na rede
    });

    // 409 é o código que o backend usa para "este e-mail já existe".
    if (resposta.status === 409) {
      throw new Error("Este e-mail já está cadastrado.");
    }

    // resposta.ok é true para qualquer status de sucesso (200 a 299).
    if (!resposta.ok) {
      throw new Error("Não foi possível cadastrar. Tente novamente.");
    }

    return resposta.json();
  }
}
