import type { InStatement } from "@libsql/client";
import type { Banco } from "../database/conexao.js";
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

// Valida e monta o INSERT sem executá-lo. A importação de faturas usa o mesmo comando
// dentro do seu lote atômico. A categoria, quando houver, deve ter sido conferida antes.
export function comandoInserirMovimentacao(usuarioId: number, movimento: NovaMovimentacao): InStatement {
  const descricao = normalizarDescricaoMovimentacao(movimento.descricao);
  validarValorEmCentavos(movimento.valorEmCentavos);
  const base = [usuarioId, descricao, movimento.tipo, movimento.valorEmCentavos, movimento.data];
  if (movimento.categoriaId !== undefined && movimento.categoriaId !== null) {
    return {
      sql: `INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data, categoria_id)
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [...base, movimento.categoriaId],
    };
  }
  return {
    sql: `INSERT INTO movimentacoes (usuario_id, descricao, tipo, valor_em_centavos, data)
      VALUES (?, ?, ?, ?, ?)`,
    args: base,
  };
}

// usuarioId deve vir da autenticação, nunca do corpo da requisição.
export function criarRepositorioMovimentacoes(db: Banco) {
  return {
    async inserir(usuarioId: number, movimento: NovaMovimentacao): Promise<number> {
      const comando = comandoInserirMovimentacao(usuarioId, movimento);
      if (movimento.categoriaId !== undefined && movimento.categoriaId !== null) {
        await validarCategoriaDoUsuario(db, usuarioId, movimento.categoriaId);
      }
      const resultado = await db.execute(comando);
      return Number(resultado.lastInsertRowid);
    },
    async listar(usuarioId: number): Promise<Lancamento[]> {
      const { rows } = await db.execute({
        sql: `SELECT id, descricao, tipo, valor_em_centavos AS valorEmCentavos, data, categoria_id AS categoriaId
          FROM movimentacoes WHERE usuario_id = ? ORDER BY data, id`,
        args: [usuarioId],
      });
      return rows as unknown as Lancamento[];
    },
  };
}
