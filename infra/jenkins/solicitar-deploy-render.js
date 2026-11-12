// Pede ao Render o deploy de uma imagem exata pelo deploy hook do serviço.
// Chamado pela pipeline-completa (Jenkinsfile), só para a main, depois da publicação comprovada:
//   RENDER_DEPLOY_HOOK=<segredo> IMAGEM_DIGEST=<repo>@sha256:<64 hex> node infra/jenkins/solicitar-deploy-render.js
//
// - A URL do hook é um segredo: nunca é impressa, gravada nem incluída em mensagens de erro.
// - Uma única tentativa, sem repetição automática: repetir poderia enfileirar deploys duplicados.
// - Resposta 200 ou 202 só significa que o Render aceitou o pedido. A versão nova só está no ar
//   quando o deploy aparece como "Live" no painel do Render.
// Respostas do hook: https://render.com/docs/deploy-hooks
const { writeFileSync } = require("node:fs");

// O Render exige que o imgURL só difira da imagem do serviço no tag ou digest.
const REPOSITORIO = "docker.io/bunnyzzw/controle-financeiro-c14";
const DIGEST = /^(?:docker\.io\/)?bunnyzzw\/controle-financeiro-c14@sha256:[0-9a-f]{64}$/;
const ID_DEPLOY = /^dep-[a-z0-9]+$/;

// Significado dos códigos segundo a documentação do Render, sem repetir a URL.
const RECUSAS = {
  400: "imgURL inválido ou diferente da imagem configurada no serviço",
  401: "a URL do hook está sem a chave",
  404: "serviço não encontrado ou chave inválida (o hook pode ter sido regenerado)",
  405: "método não aceito",
  409: "serviço suspenso ou sem permissão para deploy",
};

class FalhaDeploy extends Error {}

function montarUrl(hook, imagem, permitirLocal) {
  let url;
  try {
    url = new URL(hook);
  } catch {
    throw new FalhaDeploy("RENDER_DEPLOY_HOOK não é uma URL válida.");
  }
  const local = permitirLocal && url.protocol === "http:" && url.hostname === "127.0.0.1";
  if (!local && (url.protocol !== "https:" || url.hostname !== "api.render.com" || !url.pathname.startsWith("/deploy/"))) {
    throw new FalhaDeploy("RENDER_DEPLOY_HOOK não tem o formato https://api.render.com/deploy/...");
  }
  // searchParams codifica "/", ":" e "@" (%2F, %3A, %40), como no exemplo da documentação.
  url.searchParams.set("imgURL", imagem);
  return url;
}

function idDoDeploy(texto) {
  try {
    const corpo = JSON.parse(texto);
    const id = corpo?.deploy?.id ?? corpo?.id;
    return typeof id === "string" && ID_DEPLOY.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

async function solicitarDeploy({ hook, digest, timeoutMs = 30000, fetchImpl = fetch, permitirLocal = false }) {
  if (!hook) throw new FalhaDeploy("RENDER_DEPLOY_HOOK não foi definido.");
  if (!DIGEST.test(digest ?? "")) throw new FalhaDeploy(`Digest inválido para o deploy: '${digest}'.`);
  const imagem = `${REPOSITORIO}@${digest.split("@")[1]}`;
  const url = montarUrl(hook, imagem, permitirLocal);

  // setTimeout comum (e não AbortSignal.timeout): o temporizador mantém o processo vivo
  // até a resposta ou o limite, mesmo que a conexão fique parada.
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), timeoutMs);
  let resposta;
  try {
    // redirect "manual": um redirecionamento inesperado não leva a chave para outro endereço.
    resposta = await fetchImpl(url, { method: "POST", redirect: "manual", signal: controle.signal });
  } catch (erro) {
    const tempo = controle.signal.aborted || erro?.name === "TimeoutError" || erro?.name === "AbortError";
    // Só o nome ou o código do erro: a mensagem do cliente HTTP poderia citar o endereço.
    const motivo = tempo ? `sem resposta em ${timeoutMs / 1000} s` : `falha de rede (${erro?.cause?.code ?? erro?.name ?? "desconhecida"})`;
    throw new FalhaDeploy(`Solicitação ao Render não confirmada: ${motivo}. O Render pode ter recebido o pedido: confira o painel antes de repetir.`);
  } finally {
    clearTimeout(limite);
  }

  const corpo = await resposta.text().catch(() => "");
  if (resposta.status === 200) {
    return { situacao: "aceito", status: 200, imagem, deploy: idDoDeploy(corpo) };
  }
  if (resposta.status === 202) {
    // Política "Wait": outro deploy está em andamento; o Render segue para o pedido mais recente.
    return { situacao: "enfileirado", status: 202, imagem };
  }
  const motivo = RECUSAS[resposta.status] ?? "resposta inesperada";
  throw new FalhaDeploy(`Render recusou o deploy (HTTP ${resposta.status}: ${motivo}).`);
}

function registrar(arquivo, campos) {
  writeFileSync(arquivo, Object.entries(campos).map(([chave, valor]) => `${chave}=${valor}`).join("\n") + "\n");
}

async function main() {
  // Falha até prova em contrário: um encerramento inesperado nunca sai com código 0.
  process.exitCode = 1;
  const arquivo = "deploy-render.txt";
  const digest = process.env.IMAGEM_DIGEST;
  try {
    const r = await solicitarDeploy({
      hook: process.env.RENDER_DEPLOY_HOOK,
      digest,
      timeoutMs: Number(process.env.RENDER_TIMEOUT_MS) || 30000,
    });
    registrar(arquivo, { situacao: r.situacao, http: r.status, imagem: r.imagem, deploy: r.deploy ?? "não informado" });
    const id = r.deploy ? ` (deploy ${r.deploy})` : "";
    const fila = r.situacao === "enfileirado" ? ", na fila atrás de outro deploy" : "";
    console.log(`Render aceitou a solicitação (HTTP ${r.status}${fila})${id} para ${r.imagem}.`);
    console.log("Isso ainda não confirma a versão no ar: confira no painel do Render se o deploy ficou Live com este digest.");
    process.exitCode = 0;
  } catch (erro) {
    const mensagem = erro instanceof FalhaDeploy ? erro.message : "Erro inesperado ao solicitar o deploy.";
    registrar(arquivo, { situacao: "falhou", imagem: digest ?? "", motivo: mensagem });
    console.error(mensagem);
  }
}

if (require.main === module) main();

module.exports = { solicitarDeploy, montarUrl, FalhaDeploy };
