import type { Banco } from "./database/conexao.js";
import { createApp } from "./app.js";
import { createSqliteGoalRepository } from "./features/goals/infrastructure/sqlite-goal-repository.js";
import { createSqliteUserRepository } from "./repositories/sqliteUserRepository.js";
import { createUserService } from "./services/createUserService.js";
import { createSqliteInvoiceImportRepository } from "./features/invoice-import/infrastructure/sqlite-invoice-import-repository.js";
import { InvoiceImportWorkflow } from "./features/invoice-import/application/invoice-import-workflow.js";
import { createDefaultInvoiceImportService } from "./features/invoice-import/index.js";
import { criarRepositorioCredenciais } from "./repositories/credenciais.js";
import { criarRepositorioSessoes } from "./repositories/sessoes.js";
import { createSqliteCategoryRepository } from "./features/categories/infrastructure/sqlite-category-repository.js";

import { criarRepositorioMovimentacoes } from "./repositories/movimentacoes.js";

interface OpcoesApp {
  cookieSeguro?: boolean;
  pastaFrontend?: string;
}

export function createAppComBanco(db: Banco, { cookieSeguro = false, pastaFrontend }: OpcoesApp = {}) {
  const usuarios = createSqliteUserRepository(db);
  return createApp({
    movimentacoes: criarRepositorioMovimentacoes(db),
    metasDoUsuario: (usuarioId) => createSqliteGoalRepository(db, usuarioId),
    criarUsuario: (dados) => createUserService(dados, usuarios),
    invoiceWorkflow: new InvoiceImportWorkflow(createDefaultInvoiceImportService(), createSqliteInvoiceImportRepository(db)),
    invoiceIdentity: (req) => req.usuario?.id,
    autenticacao: {
      credenciais: criarRepositorioCredenciais(db),
      sessoes: criarRepositorioSessoes(db),
      cookieSeguro,
    },
    categoriasDoUsuario: (usuarioId) => createSqliteCategoryRepository(db, usuarioId),
    pastaFrontend,
  });
}
