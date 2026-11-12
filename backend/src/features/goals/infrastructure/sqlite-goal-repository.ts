
import type { DatabaseSync } from "node:sqlite";
import { GoalAlreadyExistsError } from "../application/create-goal-service.js";
import { createGoal, type Goal } from "../domain/goal.js";
import type { GoalCatalog } from "../domain/goal-repository.js";

// usuarioId vem da sessão autenticada, nunca do corpo da requisição.
export function createSqliteGoalRepository(
  db: DatabaseSync,
  usuarioId: number,
): GoalCatalog {
  const columns =
    "nome AS name, valor_alvo_em_centavos AS targetAmountInCents";

  return {
    async findByName(name) {
      const row = db.prepare(`
        SELECT ${columns}
        FROM metas
        WHERE usuario_id = ? AND nome = ?
      `).get(usuarioId, name);

      return row
        ? createGoal(
            row.name as string,
            row.targetAmountInCents as number,
          )
        : null;
    },

    async save(goal: Goal) {
      const validGoal = createGoal(
        goal.name,
        goal.targetAmountInCents,
      );

      const result = db.prepare(`
        INSERT INTO metas (
          usuario_id,
          nome,
          valor_alvo_em_centavos
        )
        VALUES (?, ?, ?)
        ON CONFLICT(usuario_id, nome) DO NOTHING
      `).run(
        usuarioId,
        validGoal.name,
        validGoal.targetAmountInCents,
      );

      if (result.changes === 0) {
        throw new GoalAlreadyExistsError(validGoal.name);
      }
    },

    async list() {
      return db.prepare(`
        SELECT ${columns}
        FROM metas
        WHERE usuario_id = ?
        ORDER BY id
      `).all(usuarioId).map((row) =>
        createGoal(
          row.name as string,
          row.targetAmountInCents as number,
        )
      );
    },
  };
}
