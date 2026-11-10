import type { DatabaseSync } from "node:sqlite";
import { validarValorEmCentavos } from "./validarValorEmCentavos";

export interface NovaMovimentacao {
  descricao: string;
  tipo: "receita" | "despesa";
  valorEmCentavos: number;
  data: string;
  categoriaId?: number | null;
}

export class CategoriaIndisponivel extends Error {}

// usuarioId deve vir da autenticação, nunca do corpo da requisição.
export function criarRepositorioMovimentacoes(db: DatabaseSync) {
  return {
    inserir(usuarioId: number, movimento: NovaMovimentacao): number {
      validarValorEmCentavos(movimento.valorEmCentavos);
      if (movimento.categoriaId != null) {
        const resultado = db.prepare(`
          INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data, categoria_id)
          SELECT usuario_id, ?, ?, ?, ?, id FROM categorias WHERE id = ? AND usuario_id = ?
        `).run(movimento.descricao, movimento.tipo, movimento.valorEmCentavos, movimento.data, movimento.categoriaId, usuarioId);
        if (!resultado.changes) throw new CategoriaIndisponivel("Categoria indisponível.");
        return Number(resultado.lastInsertRowid);
      }
      const resultado = db.prepare(`
        INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data)
        VALUES (?, ?, ?, ?, ?)
      `).run(usuarioId, movimento.descricao, movimento.tipo, movimento.valorEmCentavos, movimento.data);
      return Number(resultado.lastInsertRowid);
    },
    listar(usuarioId: number) {
      return db.prepare(`
        SELECT id, descricao, tipo, valor_em_centavos AS valorEmCentavos, data, categoria_id AS categoriaId
        FROM movimentacoes WHERE usuario_id = ? ORDER BY data, id
      `).all(usuarioId);
    },
  };
}

