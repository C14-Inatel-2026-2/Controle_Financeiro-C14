import { Topo } from "../components/Topo";
import type { Tela } from "../navegacao";

type Props = {
  aoNavegar: (tela: Tela) => void;
};

// Dados de exemplo enquanto a API não devolve os valores reais.
const GASTOS = [
  { categoria: "Alimentação", valor: 620_00 },
  { categoria: "Transporte", valor: 410_00 },
  { categoria: "Moradia", valor: 380_00 },
  { categoria: "Lazer", valor: 190_00 },
  { categoria: "Outros", valor: 120_00 },
];

const LANCAMENTOS = [
  { descricao: "Salário", data: "05/10", categoria: "Receita", valor: 4_000_00 },
  { descricao: "Mercado", data: "04/10", categoria: "Alimentação", valor: -268_40 },
  { descricao: "Aluguel", data: "03/10", categoria: "Moradia", valor: -380_00 },
  { descricao: "Uber", data: "02/10", categoria: "Transporte", valor: -32_90 },
  { descricao: "Freelance", data: "01/10", categoria: "Receita", valor: 200_00 },
];

// Os valores são guardados em centavos, como no backend, e só viram texto aqui.
function emReais(centavos: number): string {
  return (Math.abs(centavos) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function Dashboard({ aoNavegar }: Props) {
  const maior = Math.max(...GASTOS.map((gasto) => gasto.valor));

  return (
    <div className="ap-tela">
      <Topo ativo="dashboard" aoNavegar={aoNavegar} />

      <main className="ap-conteudo">
        <div className="ap-cabecalho">
          <h1>Dashboard</h1>
          <div className="ap-mes">
            Outubro de 2026
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 9l6 6 6-6" stroke="#9aa1ad" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <div className="ap-indicadores">
          <div className="ap-cartao">
            <div className="ap-rotulo">Saldo atual</div>
            <div className="ap-valor">{emReais(2_480_00)}</div>
            <div className="ap-nota">Receitas menos despesas</div>
          </div>
          <div className="ap-cartao">
            <div className="ap-rotulo">Receitas do mês</div>
            <div className="ap-valor ap-positivo">{emReais(4_200_00)}</div>
            <div className="ap-nota">3 lançamentos</div>
          </div>
          <div className="ap-cartao">
            <div className="ap-rotulo">Despesas do mês</div>
            <div className="ap-valor ap-negativo">{emReais(1_720_00)}</div>
            <div className="ap-nota">14 lançamentos</div>
          </div>
        </div>

        <div className="ap-colunas">
          <section className="ap-cartao">
            <h2 className="ap-secao">Gastos por categoria</h2>
            <p className="ap-nota">Outubro de 2026</p>

            <div className="ap-barras">
              {GASTOS.map((gasto) => (
                <div className="ap-barra" key={gasto.categoria}>
                  <span className="ap-barra-nome">{gasto.categoria}</span>
                  <span className="ap-trilho">
                    <span
                      className="ap-preenchimento"
                      style={{ width: `${(gasto.valor / maior) * 100}%` }}
                    />
                  </span>
                  <span className="ap-barra-valor">{emReais(gasto.valor)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="ap-cartao">
            <h2 className="ap-secao">Últimos lançamentos</h2>

            <div className="ap-lista">
              {LANCAMENTOS.map((lancamento) => (
                <div className="ap-linha" key={lancamento.descricao}>
                  <div>
                    <div className="ap-linha-titulo">{lancamento.descricao}</div>
                    <div className="ap-linha-nota">
                      {lancamento.data} · {lancamento.categoria}
                    </div>
                  </div>
                  <div className={lancamento.valor > 0 ? "ap-positivo" : "ap-negativo"}>
                    {lancamento.valor > 0 ? "+ " : "− "}
                    {emReais(lancamento.valor)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
