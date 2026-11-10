import express from "express";
import { router } from "./routes/index.js";
import { createGoalRouter } from "./routes/goalRoutes.js";
import type { GoalCatalog } from "./features/goals/domain/goal-repository.js";
import { createUserRouter } from "./routes/userRoutes.js";
import type { CriarUsuario } from "./controllers/createUserController.js";
import { createInvoiceRouter } from "./routes/invoiceRoutes.js";
import { InvoiceImportWorkflow } from "./features/invoice-import/application/invoice-import-workflow.js";
import { createDefaultInvoiceImportService } from "./features/invoice-import/index.js";
import type { InvoiceIdentity } from "./controllers/createInvoiceController.js";
import { createAuthRouter, type Autenticacao } from "./routes/authRoutes.js";
import { carregarSessao } from "./middlewares/sessao.js";
import { createCategoryRouter, type CategoriasDoUsuario } from "./routes/categoryRoutes.js";

import { criarRouterMovimentacoes, type RepositorioMovimentacoes } from "./routes/movimentacoes.js";

interface AppDependencies {
  movimentacoes?: RepositorioMovimentacoes;
  goalCatalog?: GoalCatalog;
  criarUsuario?: CriarUsuario;
  invoiceWorkflow?: InvoiceImportWorkflow;
  invoiceIdentity?: InvoiceIdentity;
  autenticacao?: Autenticacao;
  categoriasDoUsuario?: CategoriasDoUsuario;
}

export function createApp({
  goalCatalog, criarUsuario, invoiceWorkflow, invoiceIdentity, autenticacao, categoriasDoUsuario, movimentacoes,
}: AppDependencies = {}) {
  const app = express();

  // Antes das rotas: qualquer rota abaixo pode ler req.usuario.
  if (autenticacao) {
    app.use(carregarSessao(autenticacao.sessoes));
  }

  app.use("/invoice-imports", createInvoiceRouter(
    invoiceWorkflow ?? new InvoiceImportWorkflow(createDefaultInvoiceImportService()), invoiceIdentity,
  ));
  app.use(express.json());
  app.use(router);
  if (movimentacoes) app.use("/movimentacoes", criarRouterMovimentacoes(movimentacoes));

  if (autenticacao) {
    app.use("/auth", createAuthRouter(autenticacao));
  }

  if (categoriasDoUsuario) {
    app.use("/categories", createCategoryRouter(categoriasDoUsuario));
  }

  if (goalCatalog) {
    app.use("/goals", createGoalRouter(goalCatalog));
  }

  if (criarUsuario) {
    app.use("/users", createUserRouter(criarUsuario));
  } else {
    // Sem um serviço de cadastro configurado, a API informa indisponibilidade.
    app.post("/users", (_req, res) => {
      res.status(503).json({
        erro: {
          codigo: "USER_REGISTRATION_UNAVAILABLE",
          mensagem: "Cadastro de usuários indisponível.",
        },
      });
    });
  }

  return app;
}

export const app = createApp();
