import { useRef } from "react";
import { Topo } from "../components/Topo";
import type { Tela } from "../navegacao";

type Props = {
  aoNavegar: (tela: Tela) => void;
};

// Atalhos do carrossel. Os que ainda não têm tela levam o destino nulo.
const ATALHOS: {
  titulo: string;
  descricao: string;
  destino: Tela | null;
  icone: React.ReactNode;
}[] = [
  {
    titulo: "Dashboard",
    descricao: "Saldo atual e o resumo do mês",
    destino: "dashboard",
    icone: (
      <path d="M4 19V5M4 19h16M8 16V9M13 16v-5M18 16V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ),
  },
  {
    titulo: "Lançamentos",
    descricao: "Suas receitas e despesas",
    destino: null,
    icone: (
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    ),
  },
  {
    titulo: "Categorias",
    descricao: "Organize seus gastos por tipo",
    destino: "categorias",
    icone: (
      <>
        <path d="M4 11V5a1 1 0 011-1h6l9 9-7 7-9-9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
      </>
    ),
  },
  {
    titulo: "Metas",
    descricao: "Quanto falta para alcançar",
    destino: null,
    icone: (
      <>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      </>
    ),
  },
  {
    titulo: "Importar fatura",
    descricao: "Envie o PDF ou CSV do banco",
    destino: null,
    icone: (
      <path d="M12 16V4m0 0L8 8m4-4l4 4M5 17v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
];

export function Home({ aoNavegar }: Props) {
  // A referência aponta para a faixa de cards, para as setas rolarem ela.
  const faixa = useRef<HTMLDivElement>(null);

  function rolar(quanto: number) {
    faixa.current?.scrollBy({ left: quanto, behavior: "smooth" });
  }

  return (
    <div className="ap-tela">
      <Topo ativo="home" aoNavegar={aoNavegar} />

      <main className="ap-conteudo ap-conteudo-home">
        <h1 className="ap-saudacao">Bom dia, Donatto.</h1>
        <p className="ap-subtitulo">O que você quer fazer agora?</p>

        <div className="ap-cabecalho-secao">
          <h2>Atalhos</h2>
          <div className="ap-setas">
            <button className="ap-seta" onClick={() => rolar(-280)} aria-label="Anterior">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="ap-seta ap-seta-ativa" onClick={() => rolar(280)} aria-label="Próximo">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="ap-faixa" ref={faixa}>
          {ATALHOS.map((atalho) => (
            <button
              key={atalho.titulo}
              className={atalho.destino ? "ap-atalho" : "ap-atalho ap-atalho-futuro"}
              onClick={() => atalho.destino && aoNavegar(atalho.destino)}
              disabled={!atalho.destino}
              title={atalho.destino ? "" : "Tela ainda não implementada"}
            >
              <span className="ap-icone">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  {atalho.icone}
                </svg>
              </span>
              <span className="ap-atalho-titulo">{atalho.titulo}</span>
              <span className="ap-atalho-texto">{atalho.descricao}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
