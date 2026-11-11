import { useEffect, useRef, useState } from "react";
import {
  prepararPdf, ServicoDeImportacao, type ApiImportacao, type EntradaFatura,
  type OpcoesFatura, type PreviaFatura,
} from "../services/ServicoDeImportacao";
import { SessaoExpiradaError } from "../services/ServicoDeAutenticacao";
import "./ImportarFatura.css";

const defaultApi = new ServicoDeImportacao();
const reais = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Props = { aoVoltar: () => void; aoSessaoExpirada: () => void; api?: ApiImportacao };

export function ImportarFatura({ aoVoltar, aoSessaoExpirada, api = defaultApi }: Props) {
  const [options, setOptions] = useState<OpcoesFatura>();
  const [retry, setRetry] = useState(0);
  const [bank, setBank] = useState("template");
  const [csv, setCsv] = useState("");
  const [file, setFile] = useState<File>();
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState<PreviaFatura>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // A fonte e a senha ficam somente em memória até confirmar ou alterar a entrada.
  const previewSource = useRef<EntradaFatura | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    api.options().then(value => { if (active) setOptions(value); })
      .catch(() => { if (active) setError("Não foi possível consultar os formatos disponíveis."); });
    return () => { active = false; previewSource.current = undefined; };
  }, [api, retry]);

  function invalidate() {
    setPreview(undefined); previewSource.current = undefined; setError(""); setSuccess("");
  }
  async function generatePreview() {
    if (!options || busy) return;
    invalidate(); setBusy(true);
    try {
      let source: EntradaFatura;
      if (bank === "template") {
        if (new TextEncoder().encode(csv).length > options.limits.csvBytes) throw new Error("O CSV excede o limite de 100 KiB.");
        source = { mode: "template", content: csv };
      } else {
        if (!file) throw new Error("Escolha o arquivo PDF.");
        source = await prepararPdf(file, bank, password, options.limits.pdfBytes);
      }
      const result = await api.preview(source);
      previewSource.current = source;
      setPreview(result); setPassword("");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível gerar a prévia.");
    } finally { setBusy(false); }
  }
  async function confirm() {
    if (!preview || !previewSource.current || !options?.confirmationAvailable || busy) return;
    setBusy(true); setError("");
    try {
      const result = await api.confirm(previewSource.current, preview.fingerprint);
      setSuccess(`${result.importedCount} despesas registradas: ${reais(result.totalInCents)}.`);
      setPreview(undefined); previewSource.current = undefined; setFile(undefined); setCsv(""); setPassword("");
      if (fileInput.current) fileInput.current.value = "";
    } catch (failure) {
      if (failure instanceof SessaoExpiradaError) return aoSessaoExpirada();
      setError(failure instanceof Error ? failure.message : "Não foi possível confirmar a importação.");
    } finally { setBusy(false); }
  }

  return <main className="invoice-page">
    <header className="invoice-header">
      <button type="button" onClick={aoVoltar} disabled={busy}>← Voltar</button>
      <span>Controle Financeiro</span>
    </header>
    <h1>Importar fatura</h1>
    <p>Envie sua fatura ou cole o conteúdo CSV. Confira os lançamentos antes de registrar as despesas.</p>
    {error && <p role="alert" className="invoice-error">{error}</p>}
    {success && <p role="status" className="invoice-success">{success}</p>}
    {!options && !error && <p role="status">Consultando formatos disponíveis…</p>}
    {!options && error && <button type="button" onClick={() => { setError(""); setRetry(value => value + 1); }}>Tentar novamente</button>}
    {options && <>
      <form onSubmit={event => { event.preventDefault(); void generatePreview(); }} className="invoice-card">
        <label htmlFor="invoice-bank">Origem da fatura</label>
        <select id="invoice-bank" value={bank} disabled={busy} onChange={event => {
          invalidate(); setBank(event.target.value); setFile(undefined); setPassword("");
        }}>
          <option value="template">Outro banco — CSV padronizado</option>
          {options.knownBanks.map(item => <option key={item.id} value={item.id}>{item.name} — {item.formats.join(", ").toUpperCase()}</option>)}
        </select>
        {bank === "template" ? <>
          <label htmlFor="invoice-csv">Conteúdo CSV</label>
          <textarea id="invoice-csv" value={csv} disabled={busy} rows={8} spellCheck={false}
            placeholder={options.customTemplate.example} onChange={event => { invalidate(); setCsv(event.target.value); }} />
          <p>Use data;descricao;valor, datas AAAA-MM-DD e valores como 125,90. Limite: 100 KiB.</p>
          <details><summary>Modelo e orientação para conversão</summary>
            <pre>{options.customTemplate.example}</pre><p>{options.customTemplate.aiUsageNotice}</p>
          </details>
        </> : <>
          <label htmlFor="invoice-file">PDF Itaú compatível — até 5 MiB</label>
          <input ref={fileInput} id="invoice-file" type="file" accept="application/pdf,.pdf" disabled={busy}
            onChange={event => { invalidate(); setFile(event.target.files?.[0]); }} />
          <label htmlFor="invoice-password">Senha do PDF, se necessária</label>
          <input id="invoice-password" type="password" autoComplete="off" value={password} disabled={busy}
            onChange={event => { invalidate(); setPassword(event.target.value); }} />
          <p>PDF textual no layout Itaú suportado. Imagens digitalizadas não são aceitas. A senha não é salva.</p>
        </>}
        <p>Valores negativos serão descartados. A prévia não grava despesas.</p>
        <button type="submit" disabled={busy}>{busy ? "Processando…" : "Gerar prévia"}</button>
      </form>
      {preview && <section className="invoice-card" aria-label="Prévia da fatura">
        <h2>Confira os lançamentos</h2>
        <p>{preview.entries.length} lançamentos · Total: <strong>{reais(preview.totalInCents)}</strong></p>
        {preview.ignoredNegativeCount > 0 && <p>{preview.ignoredNegativeCount} lançamentos negativos descartados.</p>}
        <div className="invoice-table"><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th></tr></thead>
          <tbody>{preview.entries.map((entry, index) => <tr key={index}>
            <td>{entry.occurredOn.split("-").reverse().join("/")}</td><td>{entry.description}</td><td>{reais(entry.amountInCents)}</td>
          </tr>)}</tbody></table></div>
        {!options.confirmationAvailable && <p role="status">A confirmação ainda não está disponível. Você pode conferir a prévia.</p>}
        <button type="button" disabled={busy || !options.confirmationAvailable} onClick={() => void confirm()}>Confirmar importação</button>
      </section>}
    </>}
  </main>;
}
