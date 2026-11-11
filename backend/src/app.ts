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

interface AppDependencies {
  goalCatalog?: GoalCatalog;
  criarUsuario?: CriarUsuario;
  invoiceWorkflow?: InvoiceImportWorkflow;
  invoiceIdentity?: InvoiceIdentity;
  autenticacao?: Autenticacao;
  categoriasDoUsuario?: CategoriasDoUsuario;
  pastaFrontend?: string;
}

export function createApp({
  goalCatalog, criarUsuario, invoiceWorkflow, invoiceIdentity, autenticacao, categoriasDoUsuario, pastaFrontend,
}: AppDependencies = {}) {
  const api = express.Router();

  // Antes das rotas: qualquer rota abaixo pode ler req.usuario.
  if (autenticacao) {
    api.use(carregarSessao(autenticacao.sessoes));
  }

  api.use("/invoice-imports", createInvoiceRouter(
    invoiceWorkflow ?? new InvoiceImportWorkflow(createDefaultInvoiceImportService()), invoiceIdentity,
  ));
  api.use(express.json());
  api.use(router);

  if (autenticacao) {
    api.use("/auth", createAuthRouter(autenticacao));
  }

  if (categoriasDoUsuario) {
    api.use("/categories", createCategoryRouter(categoriasDoUsuario));
  }

  if (goalCatalog) {
    api.use("/goals", createGoalRouter(goalCatalog));
  }

  if (criarUsuario) {
    api.use("/users", createUserRouter(criarUsuario));
  } else {
    // Sem um serviço de cadastro configurado, a API informa indisponibilidade.
    api.post("/users", (_req, res) => {
      res.status(503).json({
        erro: {
          codigo: "USER_REGISTRATION_UNAVAILABLE",
          mensagem: "Cadastro de usuários indisponível.",
        },
      });
    });
  }

  const app = express();

  // O frontend chama /api, como no proxy do Vite. As rotas sem o prefixo continuam valendo.
  app.use("/api", api);
  app.use("/api", (_req, res) => {
    res.status(404).json({ erro: { codigo: "NOT_FOUND", mensagem: "Rota da API não encontrada." } });
  });

  if (pastaFrontend) {
    app.use(express.static(pastaFrontend));
  }

  app.use(api);

  return app;
}

export const app = createApp();
