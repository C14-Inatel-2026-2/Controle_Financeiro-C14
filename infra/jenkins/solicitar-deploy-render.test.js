// Testes do pedido de deploy ao Render com um servidor HTTP local simulado.
// Não acessam a internet nem o hook real. Execute: node --test infra/jenkins/solicitar-deploy-render.test.js
const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { solicitarDeploy, montarUrl } = require("./solicitar-deploy-render.js");

const DIGEST = `bunnyzzw/controle-financeiro-c14@sha256:${"a".repeat(64)}`;
const CHAVE = "chave-ficticia-nao-deve-aparecer";

// Responde de acordo com `responder` e guarda os pedidos recebidos.
async function servidor(responder) {
  const pedidos = [];
  const srv = http.createServer((req, res) => { pedidos.push(req); responder(req, res); });
  await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const hook = `http://127.0.0.1:${srv.address().port}/deploy/srv-ficticio?key=${CHAVE}`;
  return { hook, pedidos, fechar: () => { srv.closeAllConnections(); return new Promise((r) => srv.close(r)); } };
}

const pedir = (hook, extra = {}) => solicitarDeploy({ hook, digest: DIGEST, permitirLocal: true, ...extra });

async function semSegredo(promessa) {
  const erro = await promessa.then(() => assert.fail("deveria falhar"), (e) => e);
  assert.ok(!erro.message.includes(CHAVE) && !erro.message.includes("127.0.0.1"), erro.message);
  return erro;
}

test("200: aceito, com o id do deploy, um único POST e imgURL codificado pelo digest", async () => {
  const s = await servidor((_q, res) => res.end(JSON.stringify({ deploy: { id: "dep-abc123" } })));
  try {
    const r = await pedir(s.hook);
    assert.deepEqual(r, { situacao: "aceito", status: 200, imagem: `docker.io/${DIGEST}`, deploy: "dep-abc123" });
    assert.equal(s.pedidos.length, 1);
    assert.equal(s.pedidos[0].method, "POST");
    const consulta = s.pedidos[0].url.split("?")[1];
    assert.ok(consulta.includes(`key=${CHAVE}`));
    assert.ok(consulta.includes(`imgURL=docker.io%2Fbunnyzzw%2Fcontrole-financeiro-c14%40sha256%3A${"a".repeat(64)}`));
  } finally { await s.fechar(); }
});

test("200 com o id no topo do JSON e 200 sem corpo JSON", async () => {
  for (const [corpo, id] of [[JSON.stringify({ id: "dep-xyz9" }), "dep-xyz9"], ["ok", undefined]]) {
    const s = await servidor((_q, res) => res.end(corpo));
    try { assert.equal((await pedir(s.hook)).deploy, id); } finally { await s.fechar(); }
  }
});

test("202: enfileirado atrás de outro deploy, sem id", async () => {
  const s = await servidor((_q, res) => { res.statusCode = 202; res.end(); });
  try {
    assert.deepEqual(await pedir(s.hook), { situacao: "enfileirado", status: 202, imagem: `docker.io/${DIGEST}` });
  } finally { await s.fechar(); }
});

test("erros HTTP viram falha com motivo, sem repetir e sem expor a URL", async () => {
  for (const [status, trecho] of [[400, "imgURL inválido"], [404, "regenerado"], [409, "suspenso"], [500, "inesperada"]]) {
    const s = await servidor((_q, res) => { res.statusCode = status; res.end(`erro ${CHAVE}`); });
    try {
      const erro = await semSegredo(pedir(s.hook));
      assert.match(erro.message, new RegExp(`HTTP ${status}.*${trecho}`));
      assert.equal(s.pedidos.length, 1);
    } finally { await s.fechar(); }
  }
});

test("redirecionamento não é seguido (a chave não vai para outro endereço)", async () => {
  const s = await servidor((_q, res) => { res.statusCode = 302; res.setHeader("Location", "http://127.0.0.1:1/roubo"); res.end(); });
  try {
    const erro = await semSegredo(pedir(s.hook));
    assert.match(erro.message, /HTTP 302/);
    assert.equal(s.pedidos.length, 1);
  } finally { await s.fechar(); }
});

test("timeout: falha avisando que o Render pode ter recebido, sem nova tentativa", async () => {
  const s = await servidor(() => { /* nunca responde */ });
  try {
    const erro = await semSegredo(pedir(s.hook, { timeoutMs: 300 }));
    assert.match(erro.message, /sem resposta em 0.3 s.*confira o painel antes de repetir/);
    assert.equal(s.pedidos.length, 1);
  } finally { await s.fechar(); }
});

test("falha de rede: só o código do erro", async () => {
  const s = await servidor(() => {});
  await s.fechar();
  const erro = await semSegredo(pedir(s.hook));
  assert.match(erro.message, /falha de rede \(ECONNREFUSED\)/);
});

test("recusa digest inválido, latest e hook fora do Render antes de qualquer pedido", async () => {
  let chamadas = 0;
  const fetchImpl = async () => { chamadas++; return new Response("", { status: 200 }); };
  for (const digest of ["bunnyzzw/controle-financeiro-c14:latest", `outra/imagem@sha256:${"a".repeat(64)}`, "", undefined]) {
    await assert.rejects(solicitarDeploy({ hook: "https://api.render.com/deploy/srv-x?key=k", digest, fetchImpl }), /Digest inválido/);
  }
  for (const hook of ["", "nao-e-url", `http://api.render.com/deploy/srv-x?key=${CHAVE}`, `https://exemplo.test/deploy/srv-x?key=${CHAVE}`, `http://127.0.0.1/deploy/x?key=${CHAVE}`]) {
    const erro = await semSegredo(solicitarDeploy({ hook, digest: DIGEST, fetchImpl }));
    assert.match(erro.message, /RENDER_DEPLOY_HOOK/);
  }
  assert.equal(chamadas, 0);
});

test("montarUrl mantém a chave e acrescenta só o imgURL", () => {
  const url = montarUrl("https://api.render.com/deploy/srv-abc?key=k1", `docker.io/${DIGEST}`, false);
  assert.equal(url.origin + url.pathname, "https://api.render.com/deploy/srv-abc");
  assert.deepEqual([...url.searchParams.keys()], ["key", "imgURL"]);
  assert.equal(url.searchParams.get("imgURL"), `docker.io/${DIGEST}`);
});
