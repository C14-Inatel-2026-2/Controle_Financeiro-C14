import type { Usuario } from "./ServicoDeCadastro";

/**
 * Lançado pelas chamadas protegidas quando a API responde 401: a sessão
 * expirou ou foi encerrada. O App leva a pessoa de volta ao login.
 * O 401 do próprio login (senha errada) não usa este erro.
 */
export class SessaoExpiradaError extends Error {
  constructor() {
    super("Sua sessão expirou. Entre novamente.");
    this.name = "SessaoExpiradaError";
  }
}

const FALHA_LOGIN = "Não foi possível entrar. Tente novamente.";

/**
 * Conversa com a API de autenticação. A sessão fica num cookie HttpOnly que o
 * navegador guarda e reenvia sozinho na mesma origem: nada é salvo aqui.
 */
export class ServicoDeAutenticacao {
  private readonly baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  async entrar(email: string, senha: string): Promise<Usuario> {
    let resposta: Response;
    try {
      resposta = await fetch(`${this.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
    } catch {
      throw new Error(FALHA_LOGIN);
    }

    const dados = await resposta.json().catch(() => null);
    if (resposta.ok) return dados as Usuario;
    // 401 (senha errada ou e-mail inexistente) e 400 trazem a mensagem pronta.
    if (resposta.status === 401 || resposta.status === 400) {
      throw new Error(dados?.erro?.mensagem ?? "E-mail ou senha incorretos.");
    }
    throw new Error(FALHA_LOGIN);
  }

  /** Usuário da sessão atual, ou null quando não há sessão válida. */
  async usuarioAtual(): Promise<Usuario | null> {
    const resposta = await fetch(`${this.baseUrl}/auth/me`);
    if (resposta.status === 401) return null;
    if (!resposta.ok) throw new Error("Não foi possível consultar a sessão.");
    return resposta.json();
  }

  async sair(): Promise<void> {
    let resposta: Response;
    try {
      resposta = await fetch(`${this.baseUrl}/auth/logout`, { method: "POST" });
    } catch {
      throw new Error("Não foi possível sair. Tente novamente.");
    }
    if (!resposta.ok) throw new Error("Não foi possível sair. Tente novamente.");
  }
}
