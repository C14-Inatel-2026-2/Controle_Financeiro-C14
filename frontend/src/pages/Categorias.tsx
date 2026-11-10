import { useEffect, useState } from "react";
import { Topo } from "../components/Topo";
import type { Tela } from "../navegacao";
import { ServicoDeCategorias, type Categoria } from "../services/ServicoDeCategorias";

// Fora do componente: uma instância nova a cada render dispararia o useEffect de novo.
const servicoPadrao = new ServicoDeCategorias();

type Props = {
  aoNavegar: (tela: Tela) => void;
  servico?: Pick<ServicoDeCategorias, "listar" | "criar">;
};

// As cores foram escolhidas numa paleta testada para daltonismo: mesmo quem
// não distingue bem as cores consegue separar uma categoria da outra.
const CORES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"];

export function Categorias({ aoNavegar, servico = servicoPadrao }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState("");
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    servico
      .listar()
      .then((lista) => { if (ativo) setCategorias(lista); })
      .catch((erro: Error) => { if (ativo) setErroLista(erro.message); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [servico]);

  async function salvar() {
    if (salvando) return;
    if (nome.trim() === "") {
      setErroNome("Informe o nome da categoria.");
      return;
    }
    setErroNome("");
    setSalvando(true);
    try {
      const nova = await servico.criar(nome);
      setCategorias((atuais) => [...atuais, nova]);
      setNome("");
      setCriando(false);
    } catch (erro) {
      setErroNome(erro instanceof Error ? erro.message : "Não foi possível criar a categoria.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="ap-tela">
      <Topo ativo="categorias" aoNavegar={aoNavegar} />

      <main className="ap-conteudo">
        <div className="ap-cabecalho">
          <div>
            <h1>Categorias</h1>
            {!carregando && !erroLista && (
              <p className="ap-nota">{categorias.length} categorias cadastradas</p>
            )}
          </div>

          {!criando && (
            <button className="ap-botao" onClick={() => setCriando(true)}>
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
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
              {erroNome && <span className="erro" role="alert">{erroNome}</span>}
            </label>
            <button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              className="ap-link"
              onClick={() => { setCriando(false); setNome(""); setErroNome(""); }}
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
                  {categoria.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
