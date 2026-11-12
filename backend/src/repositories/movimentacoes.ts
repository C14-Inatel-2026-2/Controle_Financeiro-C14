import type { DatabaseSync } from "node:sqlite";
import { validarValorEmCentavos } from "./validarValorEmCentavos";
import { validarCategoriaDoUsuario } from "./validarCategoriaDoUsuario.js";
import { normalizarDescricaoMovimentacao } from "../models/descricaoMovimentacao.js";

export type Lancamento = NovaMovimentacao & { id: number; categoriaId: number | null };

export interface NovaMovimentacao {
  descricao: string;
  tipo: "receita" | "despesa";
  valorEmCentavos: number;
  data: string;
  // Opcional: sem categoria o lançamento é gravado com categoria_id NULL.
  categoriaId?: number | null;
}

// usuarioId deve vir da autenticação, nunca do corpo da requisição.
export function criarRepositorioMovimentacoes(db: DatabaseSync) {
  return {
    inserir(usuarioId: number, movimento: NovaMovimentacao): number {
      const descricao = normalizarDescricaoMovimentacao(movimento.descricao);
      validarValorEmCentavos(movimento.valorEmCentavos);
      if (movimento.categoriaId !== undefined && movimento.categoriaId !== null) {
        validarCategoriaDoUsuario(db, usuarioId, movimento.categoriaId);
        const comCategoria = db.prepare(`
          INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data, categoria_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(usuarioId, descricao, movimento.tipo, movimento.valorEmCentavos, movimento.data, movimento.categoriaId);
        return Number(comCategoria.lastInsertRowid);
      }
      const resultado = db.prepare(`
        INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data)
        VALUES (?, ?, ?, ?, ?)
      `).run(usuarioId, descricao, movimento.tipo, movimento.valorEmCentavos, movimento.data);
      return Number(resultado.lastInsertRowid);
    },
    listar(usuarioId: number) {
      return db.prepare(`
        SELECT id, descricao, tipo, valor_em_centavos AS valorEmCentavos, data, categoria_id AS categoriaId
        FROM movimentacoes WHERE usuario_id = ? ORDER BY data, id
      `).all(usuarioId) as unknown as Lancamento[];
    },
  };
}

