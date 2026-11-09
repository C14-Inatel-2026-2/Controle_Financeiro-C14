import type { DatabaseSync } from "node:sqlite";
import { criarRepositorioMovimentacoes } from "../../../repositories/movimentacoes.js";
import { DuplicateInvoiceError, type InvoiceImportRepository } from "../domain/invoice-import-repository.js";

type Movements = Pick<ReturnType<typeof criarRepositorioMovimentacoes>, "inserir">;

export function createSqliteInvoiceImportRepository(
  db: DatabaseSync,
  movements: Movements = criarRepositorioMovimentacoes(db),
): InvoiceImportRepository {
  const insertImport = db.prepare(`
    INSERT INTO importacoes_faturas (usuario_id, fingerprint, quantidade, total_em_centavos)
    VALUES (?, ?, ?, ?) ON CONFLICT(usuario_id, fingerprint) DO NOTHING
  `);
  const link = db.prepare("INSERT INTO importacao_lancamentos (importacao_id, movimentacao_id) VALUES (?, ?)");
  return {
    save(userId, preview) {
      // O bloqueio de escrita e a chave UNIQUE fecham a corrida entre duas confirmações.
      // Nenhum await pode ser introduzido entre BEGIN e COMMIT nesta conexão compartilhada.
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = insertImport.run(userId, preview.fingerprint, preview.entries.length, preview.totalInCents);
        if (result.changes === 0) throw new DuplicateInvoiceError();
        const importId = Number(result.lastInsertRowid);
        for (const entry of preview.entries) {
          const movementId = movements.inserir(userId, {
            descricao: entry.description, tipo: "despesa",
            valorEmCentavos: entry.amountInCents, data: entry.occurredOn,
          });
          link.run(importId, movementId);
        }
        db.exec("COMMIT");
        return { importId, importedCount: preview.entries.length, totalInCents: preview.totalInCents };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
