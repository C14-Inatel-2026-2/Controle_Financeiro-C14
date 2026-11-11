import { SessaoExpiradaError } from "./ServicoDeAutenticacao";

export type EntradaFatura =
  | { mode: "template"; content: string }
  | { mode: "known-bank"; bankId: string; file: { fileName: string; mimeType: string; base64: string; password?: string } };

export interface PreviaFatura {
  entries: { occurredOn: string; description: string; amountInCents: number }[];
  totalInCents: number;
  fingerprint: string;
  ignoredNegativeCount: number;
}
export interface OpcoesFatura {
  knownBanks: { id: string; name: string; formats: string[] }[];
  customTemplate: { example: string; aiUsageNotice: string };
  limits: { csvBytes: number; pdfBytes: number };
  confirmationAvailable: boolean;
}
export interface ReciboImportacao { importId: number; importedCount: number; totalInCents: number }
export interface ApiImportacao {
  options(): Promise<OpcoesFatura>;
  preview(entrada: EntradaFatura): Promise<PreviaFatura>;
  confirm(entrada: EntradaFatura, fingerprint: string): Promise<ReciboImportacao>;
}

export class ServicoDeImportacao implements ApiImportacao {
  private readonly baseUrl: string;
  constructor(baseUrl = "/api/invoice-imports") { this.baseUrl = baseUrl; }

  private async request<T>(path: string, body?: object): Promise<T> {
    const response = await fetch(this.baseUrl + path, body === undefined ? undefined : {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    // Só a confirmação exige sessão; o 401 dela quer dizer sessão expirada.
    if (response.status === 401) throw new SessaoExpiradaError();
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.erro?.mensagem ?? "Não foi possível processar a fatura.");
    if (data === null) throw new Error("A API retornou uma resposta inválida.");
    return data as T;
  }
  options() { return this.request<OpcoesFatura>("/options"); }
  preview(entrada: EntradaFatura) { return this.request<PreviaFatura>("/preview", entrada); }
  confirm(entrada: EntradaFatura, fingerprint: string) {
    // Reenvia a fonte para validação no servidor, nunca a lista editável de despesas.
    return this.request<ReciboImportacao>("/confirm", { ...entrada, fingerprint });
  }
}

export async function prepararPdf(file: File, bankId: string, password: string, maxBytes: number): Promise<EntradaFatura> {
  if (file.size === 0 || file.size > maxBytes) throw new Error("Escolha um PDF não vazio de até 5 MiB.");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
  return { mode: "known-bank", bankId, file: {
    fileName: file.name, mimeType: file.type || "application/pdf", base64,
    ...(password ? { password } : {}),
  } };
}
