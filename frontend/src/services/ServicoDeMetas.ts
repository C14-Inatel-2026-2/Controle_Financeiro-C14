import { SessaoExpiradaError } from "./ServicoDeAutenticacao";

export type Meta = { id: number; name: string; targetAmountInCents: number; progressAmountInCents: number };

export class ServicoDeMetas {
  private readonly baseUrl: string;
  constructor(baseUrl = "/api") { this.baseUrl = baseUrl; }

  listar(): Promise<Meta[]> { return this.requisitar(""); }
  criar(name: string, targetAmountInCents: number): Promise<Meta> {
    return this.requisitar("", { name, targetAmountInCents });
  }
  aportar(id: number, amountInCents: number): Promise<Meta> {
    return this.requisitar(`/${id}/contributions`, { amountInCents });
  }

  private async requisitar<T>(caminho: string, dados?: object): Promise<T> {
    let resposta: Response;
    try {
      resposta = await fetch(`${this.baseUrl}/goals${caminho}`, {
        credentials: "same-origin",
        ...(dados ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) } : {}),
      });
    } catch { throw new Error("Não foi possível conectar à API de metas."); }
    if (resposta.status === 401) throw new SessaoExpiradaError();
    const corpo = await resposta.json().catch(() => null);
    if (!resposta.ok || corpo === null) throw new Error(corpo?.erro?.mensagem ?? "Não foi possível concluir a operação de metas.");
    return corpo as T;
  }
}
