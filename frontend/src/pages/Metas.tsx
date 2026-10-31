import { useEffect, useState } from "react";
import { ServicoDeMetas, type Meta } from "../services/ServicoDeMetas";
import { validarMeta } from "../utils/validarMeta";

const servico = new ServicoDeMetas();
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Metas() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erroConsulta, setErroConsulta] = useState("");
  const [erroCadastro, setErroCadastro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [consulta, setConsulta] = useState(0);

  useEffect(() => {
    let ativo = true;
    servico.listar().then((dados) => {
      if (ativo) setMetas(dados);
    }).catch(() => {
      if (ativo) setErroConsulta("Não foi possível consultar as metas. Tente novamente.");
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, [consulta]);

  async function cadastrar() {
    setSucesso(false);
    setErroCadastro("");
    setSalvando(true);
    try {
      const dados = validarMeta(nome, valor);
      const meta = await servico.cadastrar(dados);
      setMetas((atuais) => [...atuais, meta]);
      setNome("");
      setValor("");
      setSucesso(true);
    } catch (erro) {
      setErroCadastro(erro instanceof Error ? erro.message : "Não foi possível cadastrar a meta.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="pagina-metas">
      <div className="titulo">
        <h1>Metas financeiras</h1>
        <p>Planeje seus objetivos e acompanhe seu progresso.</p>
      </div>
      <form onSubmit={(evento) => { evento.preventDefault(); void cadastrar(); }} noValidate>
        <label className="campo">
          Nome da meta
          <input value={nome} onChange={(evento) => setNome(evento.target.value)} required disabled={salvando} />
        </label>
        <label className="campo">
          Valor-alvo (R$)
          <input inputMode="decimal" placeholder="Ex.: 1500,00" value={valor}
            onChange={(evento) => setValor(evento.target.value)} required disabled={salvando} />
        </label>
        <button type="submit" disabled={salvando || carregando}>{salvando ? "Salvando…" : "Cadastrar meta"}</button>
        {erroCadastro && <p className="erro" role="alert">{erroCadastro}</p>}
        {sucesso && <p className="sucesso" role="status">Meta cadastrada com sucesso.</p>}
      </form>
      <section aria-labelledby="metas-cadastradas">
        <h2 id="metas-cadastradas">Metas cadastradas</h2>
        {carregando && <p role="status">Carregando metas…</p>}
        {erroConsulta && <div role="alert" className="erro">
          <p>{erroConsulta}</p>
          <button type="button" disabled={salvando} onClick={() => {
            setErroConsulta(""); setCarregando(true); setConsulta((atual) => atual + 1);
          }}>Tentar novamente</button>
        </div>}
        {!carregando && !erroConsulta && metas.length === 0 && <p>Nenhuma meta cadastrada.</p>}
        <ul className="lista-metas">
          {metas.map((meta) => <li key={meta.name}>
            <h3>{meta.name}</h3>
            <p>Valor-alvo: {moeda.format(meta.targetAmountInCents / 100)}</p>
            <p>Progresso atual: {moeda.format(meta.progressAmountInCents / 100)}</p>
            <progress aria-label={`Progresso de ${meta.name}`} value={meta.progressAmountInCents} max={meta.targetAmountInCents} />
          </li>)}
        </ul>
      </section>
    </main>
  );
}
