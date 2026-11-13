import { Router, type Response } from "express";
import {
  createGoalService,
  GoalAlreadyExistsError,
} from "../features/goals/application/create-goal-service.js";
import {
  InvalidGoalNameError,
  InvalidGoalTargetAmountError,
} from "../features/goals/domain/goal.js";
import type { GoalProgressCatalog } from "../features/goals/domain/goal-repository.js";
import { InvalidContributionError, GoalNotFoundError, GoalProgressLimitError } from "../features/goals/domain/contribution.js";
import { exigirSessao } from "../middlewares/sessao.js";

export type MetasDoUsuario = (usuarioId: number) => GoalProgressCatalog;

function respondError(res: Response, error: unknown) {
  if (
    error instanceof InvalidGoalNameError ||
    error instanceof InvalidGoalTargetAmountError || error instanceof InvalidContributionError
  ) {
    res.status(400).json({
      erro: { codigo: "VALIDATION_ERROR", mensagem: error.message },
    });
    return;
  }

  if (error instanceof GoalNotFoundError) {
    res.status(404).json({ erro: { codigo: "GOAL_NOT_FOUND", mensagem: error.message } });
    return;
  }
  if (error instanceof GoalProgressLimitError) {
    res.status(409).json({ erro: { codigo: "GOAL_PROGRESS_LIMIT", mensagem: error.message } });
    return;
  }

  if (error instanceof GoalAlreadyExistsError) {
    res.status(409).json({
      erro: { codigo: "GOAL_ALREADY_EXISTS", mensagem: error.message },
    });
    return;
  }

  res.status(500).json({
    erro: {
      codigo: "INTERNAL_ERROR",
      mensagem: "Não foi possível concluir a operação de metas.",
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
      res.json(await repository.listWithProgress());
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

      res.status(201).json(await repository.findWithProgressByName(goal.name));
    } catch (error) {
      respondError(res, error);
    }
  });

  router.post("/:id/contributions", async (req, res) => {
    try {
      const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
      res.status(201).json(await metasDoUsuario(req.usuario!.id).contribute(id, req.body?.amountInCents));
    } catch (error) {
      respondError(res, error);
    }
  });

  return router;
}
