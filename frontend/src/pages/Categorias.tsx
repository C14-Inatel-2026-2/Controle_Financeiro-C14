import { Topo, type PropsDaSessao } from "../components/Topo";
import type { Tela } from "../navegacao";
import { LIMITE_NOME_CATEGORIA, useCategorias, type ServicoDaTelaDeCategorias } from "../hooks/useCategorias";

type Props = PropsDaSessao & {
  aoNavegar: (tela: Tela) => void;
  // Chamado quando a API responde 401: o App volta ao login.
  aoSessaoExpirada: () => void;
  servico?: ServicoDaTelaDeCategorias;
};

// As cores foram escolhidas numa paleta testada para daltonismo: mesmo quem
// não distingue bem as cores consegue separar uma categoria da outra.
const CORES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"];

export function Categorias({ aoNavegar, usuario, aoSair, aoSessaoExpirada, servico }: Props) {
  const {
    categorias, carregando, erroLista, criando, nome, erroNome, salvando,
    alterarNome, abrirFormulario, cancelar, salvar,
  } = useCategorias(aoSessaoExpirada, servico);

  return (
    <div className="ap-tela">
      <Topo ativo="categorias" aoNavegar={aoNavegar} usuario={usuario} aoSair={aoSair} />

      <main className="ap-conteudo">
        <div className="ap-cabecalho">
          <div>
            <h1>Categorias</h1>
            {!carregando && !erroLista && (
              <p className="ap-nota">{categorias.length} categorias cadastradas</p>
            )}
          </div>

          {!criando && (
            <button className="ap-botao" onClick={abrirFormulario}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              Nova categoria
            </button>
          )}
        </div>

        {criando && (
          <form
            className="ap-cartao"
            onSubmit={(evento) => {
              evento.preventDefault();
              salvar();
            }}
            noValidate
          >
            <label className="campo">
              Nome da categoria
              <input
                className={erroNome ? "invalido" : ""}
                placeholder="Ex.: Alimentação"
                maxLength={LIMITE_NOME_CATEGORIA}
                value={nome}
                onChange={(e) => alterarNome(e.target.value)}
              />
              {erroNome && <span className="erro" role="alert">{erroNome}</span>}
            </label>
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              className="ap-link"
              onClick={cancelar}
            >
              Cancelar
            </button>
          </form>
        )}

        {carregando && <p className="ap-nota">Carregando categorias...</p>}
        {erroLista && <p className="erro" role="alert">{erroLista}</p>}
        {!carregando && !erroLista && categorias.length === 0 && (
          <p className="ap-nota">Nenhuma categoria ainda. Crie a primeira em "Nova categoria".</p>
        )}

        <div className="ap-grade">
          {categorias.map((categoria, indice) => (
            <div className="ap-cartao" key={categoria.id}>
              <div className="ap-categoria-topo">
                <span className="ap-categoria-nome">
                  <span className="ap-ponto" style={{ background: CORES[indice % CORES.length] }} />
                  <span className="ap-categoria-texto">{categoria.name}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
