import type { DatabaseSync } from "node:sqlite";

export interface NovaMovimentacao {
  descricao: string;
  tipo: "receita" | "despesa";
  valorEmCentavos: number;
  data: string;
}

// usuarioId deve vir da autenticação, nunca do corpo da requisição.
export function criarRepositorioMovimentacoes(db: DatabaseSync) {
  return {
    inserir(usuarioId: number, movimento: NovaMovimentacao): number {
      if (!Number.isSafeInteger(movimento.valorEmCentavos) || movimento.valorEmCentavos < 0) {
        throw new Error("O valor deve ser um inteiro não negativo em centavos.");
      }
      const resultado = db.prepare(`
        INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data)
        VALUES (?, ?, ?, ?, ?)
      `).run(usuarioId, movimento.descricao, movimento.tipo, movimento.valorEmCentavos, movimento.data);
      return Number(resultado.lastInsertRowid);
    },
    listar(usuarioId: number) {
      return db.prepare(`
        SELECT id, descricao, tipo, valor_em_centavos AS valorEmCentavos, data
        FROM movimentacoes WHERE usuario_id = ? ORDER BY data, id
      `).all(usuarioId);
    },
  };
}
