import { ConfigurableCsvProfile } from "../infrastructure/profiles/csv/configurable-csv-profile.js";

/**
 * Definição do template utilizado na entrada manual de CSV.
 *
 * Participa somente da opção "Outro banco". Contém o exemplo apresentado na
 * interface, as orientações de uso e o profile responsável pela validação.
 * Não participa da leitura de PDFs.
 */

export const STANDARD_INVOICE_TEMPLATE = [
  "data;descricao;valor",
  "2026-09-01;Supermercado;125,90",
  "2026-09-02;Estorno;-20,00",
].join("\n");

export const AI_USAGE_NOTICE =
  "Você pode usar uma ferramenta de IA para adequar os lançamentos ao template. " +
  "Antes, remova nome, CPF, endereço, número do cartão, código de barras e " +
  "outros dados pessoais. Confira todas as datas e valores antes de importar.";

export const AI_TEMPLATE_PROMPT = [
  "Converta os lançamentos abaixo para CSV usando exatamente as colunas:",
  "data;descricao;valor",
  "",
  "Regras:",
  "- Use datas no formato AAAA-MM-DD.",
  "- Use ponto e vírgula como separador.",
  "- Não invente nem remova lançamentos.",
  "- Use valores positivos para compras e negativos para estornos.",
  "- Não inclua explicações, Markdown ou blocos de código.",
  "- Se alguma informação não estiver clara, escreva ERRO na linha.",
].join("\n");

export function createStandardTemplateProfile(): ConfigurableCsvProfile {
  // O formato é restrito a três colunas, data ISO e valor monetário pt-BR.
  return new ConfigurableCsvProfile({
    id: "standard-template-v1",
    bankId: "custom",
    bankName: "Outro banco",
    version: "1",
    columns: {
      occurredOn: ["data"],
      description: ["descricao"],
      amountInCents: ["valor"],
    },
    acceptedDateFormats: ["iso"],
    amountFormat: "pt-BR",
  });
}
