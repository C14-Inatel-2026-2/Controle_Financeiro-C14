import { useEffect, useState } from "react";
import { Topo, type PropsDaSessao } from "../components/Topo";
import type { Tela } from "../navegacao";

type Props = PropsDaSessao & { aoNavegar: (tela: Tela) => void; aoSessaoExpirada: () => void };
type Resumo = {
  mes: string;
  saldoEmCentavos: number;
  receitasEmCentavos: number;
  despesasEmCentavos: number;
  gastosPorCategoria: { categoriaId: number | null; nome: string; valorEmCentavos: number }[];
  ultimosLancamentos: { id: number; descricao: string; categoria: string; tipo: "receita" | "despesa"; data: string; valorEmCentavos: number }[];
};

const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const emReais = (centavos: number) => reais.format(centavos / 100);

export function Dashboard({ aoNavegar, usuario, aoSair, aoSessaoExpirada }: Props) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [erro, setErro] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function carregar() {
      try {
        const resposta = await fetch(periodo ? "/api/resumo?mes=" + periodo : "/api/resumo", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (resposta.status === 401) { aoSessaoExpirada(); return; }
        if (!resposta.ok) throw new Error();
        const dados: Resumo = await resposta.json();
        if (!controller.signal.aborted) setResumo(dados);
      } catch {
        if (!controller.signal.aborted) setErro(true);
      }
    }
    void carregar();
    return () => controller.abort();
  }, [aoSessaoExpirada, usuario.id, periodo]);

  const mes = resumo && new Date(resumo.mes + "-01T12:00:00Z").toLocaleDateString("pt-BR", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  const maior = resumo?.gastosPorCategoria[0]?.valorEmCentavos || 1;
  return (
    <div className="ap-tela">
      <Topo ativo="dashboard" aoNavegar={aoNavegar} usuario={usuario} aoSair={aoSair} />
      <main className="ap-conteudo">
        <div className="ap-cabecalho"><h1>Dashboard</h1><label className="ap-mes">Mês <input type="month" value={periodo || resumo?.mes || ""} onChange={e => {
            if (!e.target.value) return;
            setResumo(null);
            setErro(false);
            setPeriodo(e.target.value);
          }} /></label></div>
        {erro && <p role="alert">Não foi possível carregar o resumo financeiro.</p>}
        {!erro && !resumo && <p role="status">Carregando resumo...</p>}
        {resumo && <>
          <div className="ap-indicadores">
            <div className="ap-cartao"><div className="ap-rotulo">Saldo atual</div><div className="ap-valor">{emReais(resumo.saldoEmCentavos)}</div></div>
            <div className="ap-cartao"><div className="ap-rotulo">Receitas do mês</div><div className="ap-valor ap-positivo">{emReais(resumo.receitasEmCentavos)}</div></div>
            <div className="ap-cartao"><div className="ap-rotulo">Despesas do mês</div><div className="ap-valor ap-negativo">{emReais(resumo.despesasEmCentavos)}</div></div>
          </div>
          <div className="ap-colunas">
            <section className="ap-cartao">
              <h2 className="ap-secao">Gastos por categoria</h2><p className="ap-nota">{mes}</p>
              {resumo.gastosPorCategoria.length === 0 && <p>Nenhuma despesa neste mês.</p>}
              <div className="ap-barras">{resumo.gastosPorCategoria.map(gasto => (
                <div className="ap-barra" key={gasto.categoriaId ?? "sem"}>
                  <span className="ap-barra-nome">{gasto.nome}</span>
                  <span className="ap-trilho"><span className="ap-preenchimento" style={{ width: (100 * gasto.valorEmCentavos / maior) + "%" }} /></span>
                  <span className="ap-barra-valor">{emReais(gasto.valorEmCentavos)}</span>
                </div>
              ))}</div>
            </section>
            <section className="ap-cartao">
              <h2 className="ap-secao">Últimos lançamentos da conta</h2>
              {resumo.ultimosLancamentos.length === 0 && <p>Nenhum lançamento registrado.</p>}
              <div className="ap-lista">{resumo.ultimosLancamentos.map(m => (
                <div className="ap-linha" key={m.id}>
                  <div><div className="ap-linha-titulo">{m.descricao}</div>
                    <div className="ap-linha-nota">{m.data.split("-").reverse().join("/")} · {m.categoria}</div></div>
                  <div className={m.tipo === "receita" ? "ap-positivo" : "ap-negativo"}>
                    {emReais(m.tipo === "receita" ? m.valorEmCentavos : -m.valorEmCentavos)}
                  </div>
                </div>
              ))}</div>
            </section>
          </div>
        </>}
      </main>
    </div>
  );
}
