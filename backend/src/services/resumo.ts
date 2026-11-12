import { calcularSaldo } from "./calcularSaldo.js";
import type { Lancamento } from "../repositories/movimentacoes.js";


export function mesAtual(agora = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric", month: "2-digit", timeZone: "America/Sao_Paulo",
  }).format(agora);
}

export function resumir(movimentos: Lancamento[], categorias: { id: number; name: string }[], mes: string) {
  const nomes = new Map(categorias.map(c => [c.id, c.name]));
  const gastos = new Map<number | null, number>();
  let receitas = 0;
  let despesas = 0;
  for (const m of movimentos) {
    if (!m.data.startsWith(mes + "-")) continue;
    if (m.tipo === "receita") receitas += m.valorEmCentavos;
    else {
      despesas += m.valorEmCentavos;
      gastos.set(m.categoriaId, (gastos.get(m.categoriaId) ?? 0) + m.valorEmCentavos);
    }
  }
  const nome = (id: number | null) => id === null ? "Sem categoria" : nomes.get(id) ?? "Sem categoria";
  const recentes = [...movimentos].sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id).slice(0, 5);
  return {
    mes, saldoEmCentavos: calcularSaldo(movimentos), receitasEmCentavos: receitas, despesasEmCentavos: despesas,
    gastosPorCategoria: Array.from(gastos, ([categoriaId, valorEmCentavos]) => ({
      categoriaId, nome: nome(categoriaId), valorEmCentavos,
    })).sort((a, b) => b.valorEmCentavos - a.valorEmCentavos),
    ultimosLancamentos: recentes.map(m => ({ ...m, categoria: nome(m.categoriaId) })),
  };
}
