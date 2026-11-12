
import express from "express";
import { router } from "./routes/index.js";
import {
  createGoalRouter,
  type MetasDoUsuario,
} from "./routes/goalRoutes.js";
import { createUserRouter } from "./routes/userRoutes.js";
import type { CriarUsuario } from "./controllers/createUserController.js";
import { createInvoiceRouter } from "./routes/invoiceRoutes.js";
import { InvoiceImportWorkflow } from "./features/invoice-import/application/invoice-import-workflow.js";
import { createDefaultInvoiceImportService } from "./features/invoice-import/index.js";
import type { InvoiceIdentity } from "./controllers/createInvoiceController.js";
import { createAuthRouter, type Autenticacao } from "./routes/authRoutes.js";
import { carregarSessao, exigirSessao } from "./middlewares/sessao.js";
import { tratarErrosDaApi } from "./middlewares/tratarErrosDaApi.js";
import {
  createCategoryRouter,
  type CategoriasDoUsuario,
} from "./routes/categoryRoutes.js";
import {
  criarRouterMovimentacoes,
  type RepositorioMovimentacoes,
} from "./routes/movimentacoes.js";

import { mesAtual, resumir } from "./services/resumo.js";

interface AppDependencies {
  movimentacoes?: RepositorioMovimentacoes;
  metasDoUsuario?: MetasDoUsuario;
  criarUsuario?: CriarUsuario;
  invoiceWorkflow?: InvoiceImportWorkflow;
  invoiceIdentity?: InvoiceIdentity;
  autenticacao?: Autenticacao;
  categoriasDoUsuario?: CategoriasDoUsuario;
  pastaFrontend?: string;
}

export function createApp({
  metasDoUsuario,
  criarUsuario,
  invoiceWorkflow,
  invoiceIdentity,
  autenticacao,
  categoriasDoUsuario,
  movimentacoes,
  pastaFrontend,
}: AppDependencies = {}) {
  const api = express.Router();

  // Carrega a sessão antes das rotas que utilizam autenticação.
  if (autenticacao) {
    api.use(carregarSessao(autenticacao.sessoes));
  }

  // Importação de faturas.
  api.use(
    "/invoice-imports",
    createInvoiceRouter(
      invoiceWorkflow ??
        new InvoiceImportWorkflow(createDefaultInvoiceImportService()),
      invoiceIdentity,
    ),
  );

  // Permite receber requisições JSON.
  api.use(express.json());

  // Rotas gerais da aplicação.
  api.use(router);

  // Movimentações financeiras.
  if (movimentacoes) {
    api.use(
      "/movimentacoes",
      criarRouterMovimentacoes(movimentacoes),
    );
  }

  // Resumo financeiro do usuário autenticado.
  // Funcionalidade integrada da main.
  if (movimentacoes && categoriasDoUsuario) {
    api.get("/resumo", exigirSessao, async (req, res) => {
      const id = req.usuario!.id;
      const categorias = await categoriasDoUsuario(id).list();
      res.json(resumir(movimentacoes.listar(id), categorias, mesAtual()));
    });
  }

  // Autenticação.
  if (autenticacao) {
    api.use("/auth", createAuthRouter(autenticacao));
  }

  // Categorias vinculadas ao usuário autenticado.
  if (categoriasDoUsuario) {
    api.use(
      "/categories",
      createCategoryRouter(categoriasDoUsuario),
    );
  }

  // Metas financeiras vinculadas ao usuário autenticado.
  // US05 - José.
  if (metasDoUsuario) {
    api.use(
      "/goals",
      createGoalRouter(metasDoUsuario),
    );
  }

  // Cadastro de usuários.
  if (criarUsuario) {
    api.use("/users", createUserRouter(criarUsuario));
  } else {
    api.post("/users", (_req, res) => {
      res.status(503).json({
        erro: {
          codigo: "USER_REGISTRATION_UNAVAILABLE",
          mensagem: "Cadastro de usuários indisponível.",
        },
      });
    });
  }

  // Tratamento centralizado de erros da API.
  api.use(tratarErrosDaApi);

  const app = express();

  // Rotas com prefixo /api.
  app.use("/api", api);

  app.use("/api", (_req, res) => {
    res.status(404).json({
      erro: {
        codigo: "NOT_FOUND",
        mensagem: "Rota da API não encontrada.",
      },
    });
  });

  // Disponibiliza o frontend quando configurado.
  if (pastaFrontend) {
    app.use(express.static(pastaFrontend));
  }

  // Mantém compatibilidade com as rotas sem /api.
  app.use(api);

  return app;
}

export const app = createApp();
