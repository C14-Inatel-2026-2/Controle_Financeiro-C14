import { Router, type Response } from "express";
import { createGoalService, GoalAlreadyExistsError } from "../features/goals/application/create-goal-service.js";
import { InvalidGoalNameError, InvalidGoalTargetAmountError, type Goal } from "../features/goals/domain/goal.js";
import type { GoalCatalog } from "../features/goals/domain/goal-repository.js";

// Ainda não há aportes ou vínculo com movimentações no modelo de metas.
function withProgress(goal: Goal) {
  return { ...goal, progressAmountInCents: 0 };
}

function respondError(res: Response, error: unknown) {
  const invalid = error instanceof InvalidGoalNameError || error instanceof InvalidGoalTargetAmountError;
  const duplicate = error instanceof GoalAlreadyExistsError;
  res.status(invalid ? 400 : duplicate ? 409 : 500).json({
    erro: {
      codigo: invalid ? "VALIDATION_ERROR" : duplicate ? "GOAL_ALREADY_EXISTS" : "INTERNAL_ERROR",
      mensagem: invalid || duplicate ? error.message : "Não foi possível concluir a operação de metas.",
    },
  });
}

export function createGoalRouter(repository: GoalCatalog) {
  const router = Router();
  router.get("/", async (_req, res) => {
    try {
      res.json((await repository.list()).map(withProgress));
    } catch (error) {
      respondError(res, error);
    }
  });
  router.post("/", async (req, res) => {
    try {
      const goal = await createGoalService(req.body?.name, req.body?.targetAmountInCents, repository);
      res.status(201).json(withProgress(goal));
    } catch (error) {
      respondError(res, error);
    }
  });
  return router;
}
