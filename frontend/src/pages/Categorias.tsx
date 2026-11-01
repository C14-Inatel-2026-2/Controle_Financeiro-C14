import { Topo } from "../components/Topo";
import type { Tela } from "../navegacao";

type Props = {
  aoNavegar: (tela: Tela) => void;
};

// As cores foram escolhidas numa paleta testada para daltonismo: mesmo quem
// não distingue bem as cores consegue separar uma categoria da outra.
const CATEGORIAS = [
  { nome: "Alimentação", cor: "#3987e5", total: 620_00, lancamentos: 12 },
  { nome: "Transporte", cor: "#d95926", total: 410_00, lancamentos: 8 },
  { nome: "Moradia", cor: "#199e70", total: 380_00, lancamentos: 2 },
  { nome: "Lazer", cor: "#c98500", total: 190_00, lancamentos: 5 },
  { nome: "Saúde", cor: "#d55181", total: 0, lancamentos: 0 },
  { nome: "Outros", cor: "#008300", total: 120_00, lancamentos: 3 },
];

function emReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function Categorias({ aoNavegar }: Props) {
  return (
    <div className="ap-tela">
      <Topo ativo="categorias" aoNavegar={aoNavegar} />

      <main className="ap-conteudo">
        <div className="ap-cabecalho">
          <div>
            <h1>Categorias</h1>
            <p className="ap-nota">
              {CATEGORIAS.length} categorias cadastradas
            </p>
          </div>

          <button className="ap-botao">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Nova categoria
          </button>
        </div>

        <div className="ap-grade">
          {CATEGORIAS.map((categoria) => (
            <div className="ap-cartao" key={categoria.nome}>
              <div className="ap-categoria-topo">
                <span className="ap-categoria-nome">
                  <span
                    className="ap-ponto"
                    style={{ background: categoria.cor }}
                  />
                  {categoria.nome}
                </span>
              </div>

              <div className="ap-categoria-valor">{emReais(categoria.total)}</div>
              <div className="ap-nota">
                {categoria.lancamentos === 0
                  ? "Nenhum lançamento neste mês"
                  : `${categoria.lancamentos} lançamentos neste mês`}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
