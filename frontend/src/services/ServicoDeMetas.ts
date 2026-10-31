export interface Meta {
  name: string;
  targetAmountInCents: number;
  progressAmountInCents: number;
}

function ehMeta(value: unknown): value is Meta {
  if (!value || typeof value !== "object") return false;
  const meta = value as Meta;
  return typeof meta.name === "string" && meta.name.trim().length > 0
    && Number.isSafeInteger(meta.targetAmountInCents) && meta.targetAmountInCents > 0
    && Number.isSafeInteger(meta.progressAmountInCents) && meta.progressAmountInCents >= 0;
}

export class ServicoDeMetas {
  private readonly baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  private async requisitar(init?: RequestInit): Promise<unknown> {
    const resposta = await fetch(`${this.baseUrl}/goals`, init);
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      throw new Error(typeof dados?.erro?.mensagem === "string"
        ? dados.erro.mensagem : "Não foi possível acessar as metas. Tente novamente.");
    }
    return resposta.json();
  }

  async listar(): Promise<Meta[]> {
    const metas = await this.requisitar();
    if (!Array.isArray(metas) || !metas.every(ehMeta)) throw new Error("Resposta inválida ao consultar metas.");
    return metas;
  }

  async cadastrar(dados: Pick<Meta, "name" | "targetAmountInCents">): Promise<Meta> {
    const meta = await this.requisitar({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!ehMeta(meta)) throw new Error("Resposta inválida ao cadastrar meta.");
    return meta;
  }
}
