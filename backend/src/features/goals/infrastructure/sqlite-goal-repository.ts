import type { Row } from "@libsql/client";
import type { Banco } from "../../../database/conexao.js";
import { GoalAlreadyExistsError } from "../application/create-goal-service.js";
import { createGoal, type Goal } from "../domain/goal.js";
import type { GoalProgressCatalog, GoalWithProgress } from "../domain/goal-repository.js";
import { GoalNotFoundError, GoalProgressLimitError, validateContribution } from "../domain/contribution.js";

function goalFromRow(row: Row): Goal {
  return createGoal(row.name as string, row.targetAmountInCents as number);
}

// usuarioId vem da sessão autenticada, nunca do corpo da requisição.
// Metas legadas (usuario_id NULL, da migration 6) não aparecem para nenhuma conta.
export function createSqliteGoalRepository(db: Banco, usuarioId: number): GoalProgressCatalog {
  const columns = "nome AS name, valor_alvo_em_centavos AS targetAmountInCents";
  const progressSelect = `SELECT id, ${columns},
    COALESCE((SELECT SUM(valor_em_centavos) FROM aportes_metas WHERE meta_id = metas.id), 0) AS progressAmountInCents
    FROM metas WHERE usuario_id = ?`;
  function withProgress(row: Row): GoalWithProgress {
    return { ...goalFromRow(row), id: row.id as number, progressAmountInCents: row.progressAmountInCents as number };
  }

  return {
    async listWithProgress() {
      const { rows } = await db.execute({ sql: `${progressSelect} ORDER BY id`, args: [usuarioId] });
      return rows.map(withProgress);
    },
    async findWithProgressByName(name) {
      const { rows } = await db.execute({ sql: `${progressSelect} AND nome = ?`, args: [usuarioId, name] });
      return rows[0] ? withProgress(rows[0]) : null;
    },
    async contribute(id, amountInCents) {
      validateContribution(id, amountInCents);
      // O batch write serializa a verificação do limite, a gravação e a leitura no libSQL/Turso.
      const [insert, selected] = await db.batch([
        { sql: `INSERT INTO aportes_metas (meta_id, usuario_id, valor_em_centavos)
            SELECT id, usuario_id, ? FROM metas WHERE id = ? AND usuario_id = ?
            AND COALESCE((SELECT SUM(valor_em_centavos) FROM aportes_metas WHERE meta_id = metas.id), 0) <= ?`,
          args: [amountInCents, id, usuarioId, Number.MAX_SAFE_INTEGER - amountInCents] },
        { sql: `${progressSelect} AND id = ?`, args: [usuarioId, id] },
      ], "write");
      if (!selected.rows[0]) throw new GoalNotFoundError();
      if (insert.rowsAffected === 0) throw new GoalProgressLimitError();
      return withProgress(selected.rows[0]);
    },
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
