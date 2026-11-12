import { ConfigurableCsvProfile } from "../../../src/features/invoice-import/infrastructure/profiles/csv/configurable-csv-profile.js";

// Perfil fictício exclusivo dos testes; cada chamada cria sua própria configuração.
export function createExampleCsvProfile(
  id = "example-bank-csv-v1",
  version = "1",
): ConfigurableCsvProfile {
  return new ConfigurableCsvProfile({
    id,
    bankId: "example-bank",
    bankName: "Banco Exemplo",
    version,
    columns: {
      occurredOn: ["data da compra"],
      description: ["estabelecimento"],
      amountInCents: ["valor (r$)"],
    },
    acceptedDateFormats: ["pt-BR"],
    amountFormat: "pt-BR",
  });
}
