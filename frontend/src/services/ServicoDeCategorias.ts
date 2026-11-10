export type Categoria = {
  id: number;
  name: string;
};

/** Conversa com a API de categorias. O cookie da sessão vai junto sozinho. */
export class ServicoDeCategorias {
  private readonly baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  listar(): Promise<Categoria[]> {
    return this.requisitar("Não foi possível carregar as categorias.");
  }

  criar(name: string): Promise<Categoria> {
    return this.requisitar("Não foi possível criar a categoria.", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  private async requisitar<T>(mensagemPadrao: string, opcoes?: RequestInit): Promise<T> {
    let resposta: Response;
    try {
      resposta = await fetch(`${this.baseUrl}/categories`, opcoes);
    } catch {
      throw new Error(mensagemPadrao);
    }

    if (resposta.status === 401) {
      throw new Error("Faça login para ver suas categorias.");
    }

    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      // 400 e 409 trazem uma mensagem pronta para mostrar (nome inválido ou repetido).
      throw new Error(dados?.erro?.mensagem ?? mensagemPadrao);
    }
    return dados as T;
  }
}
