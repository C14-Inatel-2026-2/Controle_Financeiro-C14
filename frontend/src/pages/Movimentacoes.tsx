import { useEffect, useState, type FormEvent } from "react";
import { Topo, type PropsDaSessao } from "../components/Topo";
import type { Tela } from "../navegacao";
import { ServicoDeCategorias, type Categoria } from "../services/ServicoDeCategorias";
import { SessaoExpiradaError } from "../services/ServicoDeAutenticacao";

type Props = PropsDaSessao & { aoNavegar: (tela: Tela) => void; aoSessaoExpirada: () => void };
type Movimento = {
  id: number; descricao: string; tipo: "receita" | "despesa";
  valorEmCentavos: number; data: string; categoriaId: number | null;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const categoriasApi = new ServicoDeCategorias();

async function requisitar<T>(opcoes?: RequestInit): Promise<T> {
  const resposta = await fetch("/api/movimentacoes", opcoes);
  if (resposta.status === 401) throw new SessaoExpiradaError();
  if (!resposta.ok) {
    const dados = await resposta.json().catch(() => null);
    throw new Error(dados?.erro?.mensagem ?? "Não foi possível concluir a operação.");
  }
  return resposta.json();
}

export function Movimentacoes({ usuario, aoSair, aoNavegar, aoSessaoExpirada }: Props) {
  const [lista, setLista] = useState<Movimento[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativa = true;
    Promise.all([requisitar<Movimento[]>(), categoriasApi.listar()])
      .then(([movimentos, opcoes]) => {
        if (ativa) { setLista(movimentos); setCategorias(opcoes); }
      }).catch(falha => {
        if (!ativa) return;
        if (falha instanceof SessaoExpiradaError) aoSessaoExpirada();
        else setErro("Não foi possível carregar os lançamentos.");
      });
    return () => { ativa = false; };
  }, [aoSessaoExpirada]);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (salvando || !lista) return;
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const valor = String(dados.get("valor")).trim();
    const [inteiros, fracao = ""] = valor.split(/[,.]/);
    const valorEmCentavos = Number(inteiros + fracao.padEnd(2, "0"));
    if (!/^\d+([,.]\d{1,2})?$/.test(valor) || !Number.isSafeInteger(valorEmCentavos)) {
      setErro("Informe um valor em reais com até duas casas decimais.");
      return;
    }
    const movimento: Omit<Movimento, "id"> = {
      descricao: String(dados.get("descricao")).trim(), data: String(dados.get("data")),
      categoriaId: dados.get("categoria") ? Number(dados.get("categoria")) : null,
      tipo: dados.get("tipo") === "receita" ? "receita" : "despesa", valorEmCentavos,
    };
    setSalvando(true);
    setErro("");
    try {
      const { id } = await requisitar<{ id: number }>({ method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(movimento) });
      setLista(atual => [...(atual ?? []), { ...movimento, id }]);
      form.reset();
    } catch (falha) {
      if (falha instanceof SessaoExpiradaError) aoSessaoExpirada();
      else setErro(falha instanceof Error ? falha.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return <div className="ap-tela">
    <Topo ativo="movimentacoes" {...{ usuario, aoSair, aoNavegar }} />
    <main className="ap-conteudo">
      <h1>Lançamentos</h1>
      {erro && <p role="alert">{erro}</p>}
      {lista === null && !erro && <p role="status">Carregando lançamentos...</p>}
      {lista !== null && <div className="ap-colunas">
        <section className="ap-cartao"><h2>Novo lançamento</h2>
          <form onSubmit={salvar}>
            <label className="campo">Descrição<input name="descricao" required /></label>
            <label className="campo">Tipo<select name="tipo"><option value="despesa">Despesa</option><option value="receita">Receita</option></select></label>
            <label className="campo">Valor em reais<input name="valor" inputMode="decimal" placeholder="0,00" required /></label>
            <label className="campo">Data<input name="data" type="date" required defaultValue={new Date().toLocaleDateString("sv-SE")} /></label>
            <label className="campo">Categoria<select name="categoria"><option value="">Sem categoria</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
            <button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar lançamento"}</button>
          </form>
        </section>
        <section className="ap-cartao"><h2>Histórico</h2>
          {lista.length === 0 && <p>Nenhum lançamento registrado.</p>}
          {[...lista].sort((a,b) => b.data.localeCompare(a.data) || b.id - a.id).map(m => (
            <div className="ap-linha" key={m.id}>
              <div><strong>{m.descricao}</strong><div className="ap-linha-nota">{m.data.split("-").reverse().join("/")} · {categorias.find(c => c.id === m.categoriaId)?.name ?? "Sem categoria"}</div></div>
              <span className={m.tipo === "receita" ? "ap-positivo" : "ap-negativo"}>{moeda.format((m.tipo === "receita" ? 1 : -1) * m.valorEmCentavos / 100)}</span>
            </div>
          ))}
        </section>
      </div>}
    </main>
  </div>;
}
