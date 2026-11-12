import type { Banco } from "../../../database/conexao.js";
import { GoalAlreadyExistsError } from "../application/create-goal-service.js";
import { createGoal, type Goal } from "../domain/goal.js";
import type { GoalCatalog } from "../domain/goal-repository.js";

export function createSqliteGoalRepository(db: Banco): GoalCatalog {
  const columns = "nome AS name, valor_alvo_em_centavos AS targetAmountInCents";
  return {
    async findByName(name) {
      const { rows } = await db.execute({ sql: `SELECT ${columns} FROM metas WHERE nome = ?`, args: [name] });
      const row = rows[0];
      return row ? createGoal(row.name as string, row.targetAmountInCents as number) : null;
    },
    async save(goal: Goal) {
      const validGoal = createGoal(goal.name, goal.targetAmountInCents);
      // O índice UNIQUE também protege contra cadastros simultâneos.
      const result = await db.execute({
        sql: `INSERT INTO metas (nome, valor_alvo_em_centavos)
          VALUES (?, ?) ON CONFLICT(nome) DO NOTHING`,
        args: [validGoal.name, validGoal.targetAmountInCents],
      });
      if (result.rowsAffected === 0) throw new GoalAlreadyExistsError(validGoal.name);
    },
    async list() {
      const { rows } = await db.execute(`SELECT ${columns} FROM metas ORDER BY id`);
      return rows.map((row) => createGoal(row.name as string, row.targetAmountInCents as number));
    },
  };
}
