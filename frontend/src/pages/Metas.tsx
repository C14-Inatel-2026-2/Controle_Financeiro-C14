import { useEffect, useRef, useState, type FormEvent } from "react";
import { Topo, type PropsDaSessao } from "../components/Topo";
import type { Tela } from "../navegacao";
import { ServicoDeMetas, type Meta } from "../services/ServicoDeMetas";
import { SessaoExpiradaError } from "../services/ServicoDeAutenticacao";
import { centavosDeReais } from "../utils/centavosDeReais";
import "./Metas.css";

type Props = PropsDaSessao & {
  aoNavegar: (tela: Tela) => void;
  aoSessaoExpirada: () => void;
  servico?: Pick<ServicoDeMetas, "listar" | "criar" | "aportar">;
};
const api = new ServicoDeMetas();
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
function reais(centavos: number): string {
  // Preserva os centavos até MAX_SAFE_INTEGER também na apresentação.
  const valor = BigInt(centavos);
  return moeda.formatToParts(valor / 100n)
    .map(parte => parte.type === "fraction" ? String(valor % 100n).padStart(2, "0") : parte.value).join("");
}

export function Metas({ usuario, aoSair, aoNavegar, aoSessaoExpirada, servico = api }: Props) {
  const [metas, setMetas] = useState<Meta[] | null>(null);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const ocupado = useRef(false);

  useEffect(() => {
    let ativa = true;
    servico.listar().then(lista => { if (ativa) setMetas(lista); }).catch(falha => {
      if (!ativa) return;
      if (falha instanceof SessaoExpiradaError) aoSessaoExpirada();
      else setErro(falha instanceof Error ? falha.message : "Falha ao carregar metas.");
    });
    return () => { ativa = false; };
  }, [servico, aoSessaoExpirada]);

  async function salvar(evento: FormEvent<HTMLFormElement>, aporte: boolean) {
    evento.preventDefault();
    if (ocupado.current || metas === null) return;
    const form = evento.currentTarget;
    const campos = new FormData(form);
    setErro(""); setSucesso("");
    try {
      const valor = centavosDeReais(String(campos.get("valor") ?? ""));
      const nome = String(campos.get("nome") ?? "").trim();
      const id = Number(campos.get("meta"));
      if (!aporte && !nome) throw new Error("Informe o nome da meta.");
      if (aporte && !metas.some(meta => meta.id === id)) throw new Error("Selecione uma meta.");
      ocupado.current = true; setSalvando(true);
      const resultado = aporte ? await servico.aportar(id, valor) : await servico.criar(nome, valor);
      setMetas(atuais => aporte ? (atuais ?? []).map(meta => meta.id === resultado.id ? resultado : meta) : [...(atuais ?? []), resultado]);
      form.reset();
      setSucesso(aporte ? "Aporte registrado." : "Meta cadastrada.");
    } catch (falha) {
      if (falha instanceof SessaoExpiradaError) aoSessaoExpirada();
      else setErro(falha instanceof Error ? falha.message : "Não foi possível salvar.");
    } finally { ocupado.current = false; setSalvando(false); }
  }

  return <div className="ap-tela">
    <Topo ativo="metas" {...{ usuario, aoSair, aoNavegar }} />
    <main className="ap-conteudo">
      <h1>Metas financeiras</h1>
      <p className="ap-nota">Aportes registram sua reserva e não alteram receitas, despesas ou saldo geral.</p>
      {erro && <p role="alert" className="erro">{erro}</p>}
      {sucesso && <p role="status">{sucesso}</p>}
      {metas === null && !erro && <p role="status">Carregando metas...</p>}
      {metas !== null && <>
        <div className="ap-colunas">
          <section className="ap-cartao"><h2>Nova meta</h2>
            <form onSubmit={e => void salvar(e, false)} noValidate>
              <label className="campo">Nome da meta<input name="nome" required /></label>
              <label className="campo">Valor-alvo em reais<input name="valor" inputMode="decimal" placeholder="0,00" required /></label>
              <button disabled={salvando} type="submit">Cadastrar meta</button>
            </form>
          </section>
          <section className="ap-cartao"><h2>Registrar aporte</h2>
            {metas.length === 0 ? <p>Cadastre uma meta para aportar.</p> : <form onSubmit={e => void salvar(e, true)} noValidate>
              <label className="campo">Meta<select name="meta" defaultValue=""><option value="">Selecione uma meta</option>
                {metas.map(meta => <option key={meta.id} value={meta.id}>{meta.name}</option>)}
              </select></label>
              <label className="campo">Valor do aporte em reais<input name="valor" inputMode="decimal" placeholder="0,00" required /></label>
              <button disabled={salvando} type="submit">Confirmar aporte</button>
            </form>}
          </section>
        </div>
        <h2>Suas metas</h2>
        {metas.length === 0 && <p>Nenhuma meta cadastrada.</p>}
        <div className="ap-grade">{metas.map(meta => {
          const percentual = meta.progressAmountInCents / meta.targetAmountInCents * 100;
          return <article className="ap-cartao meta-cartao" key={meta.id}>
            <h3>{meta.name}</h3>
            <p>Valor-alvo: {reais(meta.targetAmountInCents)}</p>
            <p>Acumulado: {reais(meta.progressAmountInCents)}</p>
            <p>Conclusão: {percentual.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</p>
            <div className="meta-barra" role="progressbar" aria-label={`Progresso de ${meta.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(percentual, 100)} aria-valuetext={`${percentual.toLocaleString("pt-BR")}%`}>
              <div style={{ width: `${Math.min(percentual, 100)}%` }} />
            </div>
          </article>;
        })}</div>
      </>}
    </main>
  </div>;
}
