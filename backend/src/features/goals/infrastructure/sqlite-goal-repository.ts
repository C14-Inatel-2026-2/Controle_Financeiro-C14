import type { DatabaseSync } from "node:sqlite";
import { GoalAlreadyExistsError } from "../application/create-goal-service.js";
import { createGoal, type Goal } from "../domain/goal.js";
import type { GoalCatalog } from "../domain/goal-repository.js";

export function createSqliteGoalRepository(db: DatabaseSync): GoalCatalog {
  const columns = "nome AS name, valor_alvo_em_centavos AS targetAmountInCents";
  return {
    async findByName(name) {
      const row = db.prepare(`SELECT ${columns} FROM metas WHERE nome = ?`).get(name);
      return row ? createGoal(row.name as string, row.targetAmountInCents as number) : null;
    },
    async save(goal: Goal) {
      const validGoal = createGoal(goal.name, goal.targetAmountInCents);
      // O índice UNIQUE também protege contra cadastros simultâneos.
      const result = db.prepare(`INSERT INTO metas (nome, valor_alvo_em_centavos)
        VALUES (?, ?) ON CONFLICT(nome) DO NOTHING`)
        .run(validGoal.name, validGoal.targetAmountInCents);
      if (result.changes === 0) throw new GoalAlreadyExistsError(validGoal.name);
    },
    async list() {
      return db.prepare(`SELECT ${columns} FROM metas ORDER BY id`).all()
        .map((row) => createGoal(row.name as string, row.targetAmountInCents as number));
    },
  };
}
