import type { DatabaseSync } from "node:sqlite";
import { createApp } from "./app.js";
import { createSqliteGoalRepository } from "./features/goals/infrastructure/sqlite-goal-repository.js";
import { createSqliteUserRepository } from "./repositories/sqliteUserRepository.js";
import { createUserService } from "./services/createUserService.js";
import { createSqliteInvoiceImportRepository } from "./features/invoice-import/infrastructure/sqlite-invoice-import-repository.js";
import { InvoiceImportWorkflow } from "./features/invoice-import/application/invoice-import-workflow.js";
import { createDefaultInvoiceImportService } from "./features/invoice-import/index.js";
import type { InvoiceIdentity } from "./controllers/createInvoiceController.js";

export function createAppComBanco(db: DatabaseSync, invoiceIdentity?: InvoiceIdentity) {
  const usuarios = createSqliteUserRepository(db);
  return createApp({
    goalCatalog: createSqliteGoalRepository(db),
    criarUsuario: (dados) => createUserService(dados, usuarios),
    invoiceWorkflow: new InvoiceImportWorkflow(createDefaultInvoiceImportService(), createSqliteInvoiceImportRepository(db)),
    invoiceIdentity,
  });
}
