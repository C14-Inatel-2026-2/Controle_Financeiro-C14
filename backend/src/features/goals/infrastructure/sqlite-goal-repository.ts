import type { Row } from "@libsql/client";
import type { Banco } from "../../../database/conexao.js";
import { GoalAlreadyExistsError } from "../application/create-goal-service.js";
import { createGoal, type Goal } from "../domain/goal.js";
import type { GoalCatalog } from "../domain/goal-repository.js";

function goalFromRow(row: Row): Goal {
  return createGoal(row.name as string, row.targetAmountInCents as number);
}

// usuarioId vem da sessão autenticada, nunca do corpo da requisição.
// Metas legadas (usuario_id NULL, da migration 6) não aparecem para nenhuma conta.
export function createSqliteGoalRepository(db: Banco, usuarioId: number): GoalCatalog {
  const columns = "nome AS name, valor_alvo_em_centavos AS targetAmountInCents";

  return {
    async findByName(name) {
      const { rows } = await db.execute({
        sql: `SELECT ${columns} FROM metas WHERE usuario_id = ? AND nome = ?`,
        args: [usuarioId, name],
      });
      const row = rows[0];
      return row ? goalFromRow(row) : null;
    },

    async save(goal: Goal) {
      const validGoal = createGoal(goal.name, goal.targetAmountInCents);
      // O índice UNIQUE (usuario_id, nome) também protege contra cadastros simultâneos.
      const result = await db.execute({
        sql: `INSERT INTO metas (usuario_id, nome, valor_alvo_em_centavos)
          VALUES (?, ?, ?) ON CONFLICT(usuario_id, nome) DO NOTHING`,
        args: [usuarioId, validGoal.name, validGoal.targetAmountInCents],
      });
      if (result.rowsAffected === 0) throw new GoalAlreadyExistsError(validGoal.name);
    },

    async list() {
      const { rows } = await db.execute({
        sql: `SELECT ${columns} FROM metas WHERE usuario_id = ? ORDER BY id`,
        args: [usuarioId],
      });
      return rows.map(goalFromRow);
    },
  };
}
