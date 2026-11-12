import type { InStatement } from "@libsql/client";
import type { Banco } from "../../../database/conexao.js";
import { comandoInserirMovimentacao } from "../../../repositories/movimentacoes.js";
import { DuplicateInvoiceError, type InvoiceImportRepository } from "../domain/invoice-import-repository.js";

export function createSqliteInvoiceImportRepository(db: Banco): InvoiceImportRepository {
  return {
    async save(userId, preview) {
      // Valida todas as despesas antes de tocar no banco.
      const lancamentos = preview.entries.map((entry) => comandoInserirMovimentacao(userId, {
        descricao: entry.description, tipo: "despesa",
        valorEmCentavos: entry.amountInCents, data: entry.occurredOn,
      }));
      const importacao = "(SELECT id FROM importacoes_faturas WHERE usuario_id = ? AND fingerprint = ?)";
      const vincular: InStatement = {
        sql: `INSERT INTO importacao_lancamentos (importacao_id, movimentacao_id) VALUES (${importacao}, last_insert_rowid())`,
        args: [userId, preview.fingerprint],
      };
      try {
        // Um batch "write" é uma transação: a fatura, as despesas e os vínculos entram juntos
        // ou nada entra. Funciona igual no arquivo local e no Turso, numa única ida ao banco.
        const [registro] = await db.batch([
          {
            sql: `INSERT INTO importacoes_faturas (usuario_id, fingerprint, quantidade, total_em_centavos)
              VALUES (?, ?, ?, ?)`,
            args: [userId, preview.fingerprint, preview.entries.length, preview.totalInCents],
          },
          ...lancamentos.flatMap((lancamento) => [lancamento, vincular]),
        ], "write");
        return {
          importId: Number(registro!.lastInsertRowid),
          importedCount: preview.entries.length,
          totalInCents: preview.totalInCents,
        };
      } catch (error) {
        // A chave UNIQUE (usuario_id, fingerprint) desfaz o lote quando a fatura já existe,
        // inclusive em duas confirmações simultâneas. Depois do rollback, confirmamos o motivo.
        const existente = await db.execute({ sql: `SELECT 1 FROM importacoes_faturas WHERE usuario_id = ? AND fingerprint = ?`, args: [userId, preview.fingerprint] });
        if (existente.rows.length > 0) throw new DuplicateInvoiceError();
        throw error;
      }
    },
  };
}
