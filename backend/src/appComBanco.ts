import type { DatabaseSync } from "node:sqlite";
import { createApp } from "./app.js";
import { createSqliteGoalRepository } from "./features/goals/infrastructure/sqlite-goal-repository.js";
import { createSqliteUserRepository } from "./repositories/sqliteUserRepository.js";
import { createUserService } from "./services/createUserService.js";
import { createSqliteInvoiceImportRepository } from "./features/invoice-import/infrastructure/sqlite-invoice-import-repository.js";
import { InvoiceImportWorkflow } from "./features/invoice-import/application/invoice-import-workflow.js";
import { createDefaultInvoiceImportService } from "./features/invoice-import/index.js";
import { criarRepositorioCredenciais } from "./repositories/credenciais.js";
import { criarRepositorioSessoes } from "./repositories/sessoes.js";

export function createAppComBanco(db: DatabaseSync) {
  const usuarios = createSqliteUserRepository(db);
  return createApp({
    goalCatalog: createSqliteGoalRepository(db),
    criarUsuario: (dados) => createUserService(dados, usuarios),
    invoiceWorkflow: new InvoiceImportWorkflow(createDefaultInvoiceImportService(), createSqliteInvoiceImportRepository(db)),
    invoiceIdentity: (req) => req.usuario?.id,
    autenticacao: {
      credenciais: criarRepositorioCredenciais(db),
      sessoes: criarRepositorioSessoes(db),
      // Em produção a API deve estar atrás de HTTPS. O deploy local usa HTTP sem NODE_ENV.
      cookieSeguro: process.env.NODE_ENV === "production",
    },
  });
}
