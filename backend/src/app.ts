import express from "express";
import { router } from "./routes/index.js";
import { createGoalRouter } from "./routes/goalRoutes.js";
import type { GoalCatalog } from "./features/goals/domain/goal-repository.js";
import { createUserRouter } from "./routes/userRoutes.js";
import type { CriarUsuario } from "./controllers/createUserController.js";

interface AppDependencies {
  goalCatalog?: GoalCatalog;
  criarUsuario?: CriarUsuario;
}

export function createApp({ goalCatalog, criarUsuario }: AppDependencies = {}) {
  const app = express();

  app.use(express.json());
  app.use(router);

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
