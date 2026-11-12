import { Router, type Response } from "express";
import {
  createGoalService,
  GoalAlreadyExistsError,
} from "../features/goals/application/create-goal-service.js";
import {
  InvalidGoalNameError,
  InvalidGoalTargetAmountError,
  type Goal,
} from "../features/goals/domain/goal.js";
import type { GoalCatalog } from "../features/goals/domain/goal-repository.js";
import { exigirSessao } from "../middlewares/sessao.js";

export type MetasDoUsuario = (usuarioId: number) => GoalCatalog;

function withProgress(goal: Goal) {
  // Ainda não há regra de aportes ou vínculo com movimentações definida pela equipe.
  return { ...goal, progressAmountInCents: 0 };
}

function respondError(res: Response, error: unknown) {
  const invalid =
    error instanceof InvalidGoalNameError ||
    error instanceof InvalidGoalTargetAmountError;

  const duplicate = error instanceof GoalAlreadyExistsError;

  res.status(invalid ? 400 : duplicate ? 409 : 500).json({
    erro: {
      codigo: invalid
        ? "VALIDATION_ERROR"
        : duplicate
          ? "GOAL_ALREADY_EXISTS"
          : "INTERNAL_ERROR",
      mensagem:
        invalid || duplicate
          ? error.message
          : "Não foi possível concluir a operação de metas.",
    },
  });
}

export function createGoalRouter(
  metasDoUsuario: MetasDoUsuario,
) {
  const router = Router();

  // Todas as rotas de metas exigem autenticação.
  router.use(exigirSessao);

  router.get("/", async (req, res) => {
    try {
      const repository = metasDoUsuario(req.usuario!.id);
      res.json((await repository.list()).map(withProgress));
    } catch (error) {
      respondError(res, error);
    }
  });

  router.post("/", async (req, res) => {
    try {
      const repository = metasDoUsuario(req.usuario!.id);

      const goal = await createGoalService(
        req.body?.name,
        req.body?.targetAmountInCents,
        repository,
      );

      res.status(201).json(withProgress(goal));
    } catch (error) {
      respondError(res, error);
    }
  });

  return router;
}
