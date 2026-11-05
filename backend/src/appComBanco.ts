import type { DatabaseSync } from "node:sqlite";
import { createApp } from "./app.js";
import { createSqliteGoalRepository } from "./features/goals/infrastructure/sqlite-goal-repository.js";
import { createSqliteUserRepository } from "./repositories/sqliteUserRepository.js";
import { createUserService } from "./services/createUserService.js";

export function createAppComBanco(db: DatabaseSync) {
  const usuarios = createSqliteUserRepository(db);
  return createApp({
    goalCatalog: createSqliteGoalRepository(db),
    criarUsuario: (dados) => createUserService(dados, usuarios),
  });
}
