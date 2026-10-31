import express from "express";
import { router } from "./routes/index.js";
import { createGoalRouter } from "./routes/goalRoutes.js";
import type { GoalCatalog } from "./features/goals/domain/goal-repository.js";

export function createApp(repository: GoalCatalog) {
  const app = express();
  app.use(express.json());
  app.use(router);
  app.use("/goals", createGoalRouter(repository));
  return app;
}
