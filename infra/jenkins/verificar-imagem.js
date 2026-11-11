// Verifica a aplicação de dentro do contêiner, sem depender de portas publicadas:
//   docker exec -i -e ETAPA=antes <contêiner> node - < infra/jenkins/verificar-imagem.js
// ETAPA=antes cadastra um usuário fictício; ETAPA=depois roda num contêiner
// recriado com o mesmo volume e confirma que o cadastro continua salvo.
// O cookie é enviado à mão, então o fluxo funciona com ou sem COOKIE_SECURE.
const { readFileSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

// Fica no volume do SQLite, que só existe durante a verificação.
const arquivoSessao = join(dirname(process.env.DATABASE_PATH || "data/financeiro.sqlite"), "verificacao-sessao.txt");
const base = `http://localhost:${process.env.PORT || 3000}`;
const usuario = { nome: "Verificação CI", email: "verificacao-ci@example.test", senha: "senha-ficticia-ci" };

async function chamar(caminho, opcoes) {
  const resposta = await fetch(base + caminho, opcoes);
  const texto = await resposta.text();
  return { status: resposta.status, texto, cookie: resposta.headers.get("set-cookie") ?? "" };
}

function postJson(caminho, corpo, cookie = "") {
  return chamar(caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(corpo),
  });
}

function conferir(descricao, condicao) {
  if (!condicao) throw new Error(`Falhou: ${descricao}`);
  console.log(`ok - ${descricao}`);
}

async function esperarHealth() {
  for (let tentativa = 0; tentativa < 30; tentativa++) {
    try {
      if ((await chamar("/health")).status === 200) return;
    } catch {
      // A aplicação ainda está abrindo a porta.
    }
    await new Promise((resolver) => setTimeout(resolver, 1000));
  }
  throw new Error("A aplicação não respondeu em /health.");
}

async function main() {
  const etapa = process.env.ETAPA;
  if (etapa !== "antes" && etapa !== "depois") throw new Error("Defina ETAPA=antes ou ETAPA=depois.");

  await esperarHealth();
  conferir("/health responde 200", (await chamar("/health")).texto === '{"status":"ok"}');
  conferir("/api/health responde 200", (await chamar("/api/health")).status === 200);

  const inicio = await chamar("/");
  conferir("o frontend é servido em /", inicio.status === 200 && inicio.texto.includes('<div id="root">'));
  conferir("rota desconhecida em /api responde 404", (await chamar("/api/nao-existe")).status === 404);

  const cadastro = await postJson("/api/users", usuario);
  if (etapa === "antes") {
    conferir("cadastro pela API responde 201", cadastro.status === 201);
  } else {
    conferir("o cadastro sobreviveu à recriação do contêiner (409)", cadastro.status === 409);
    const sessaoAntiga = readFileSync(arquivoSessao, "utf8");
    conferir("a sessão criada antes da recriação continua válida", (await chamar("/api/auth/me", { headers: { Cookie: sessaoAntiga } })).status === 200);
  }

  const login = await postJson("/api/auth/login", { email: usuario.email, senha: usuario.senha });
  conferir("login pela API responde 200", login.status === 200);
  conferir("cookie de sessão é HttpOnly", login.cookie.includes("HttpOnly"));
  const secureEsperado = process.env.COOKIE_SECURE !== "false";
  conferir(`cookie de sessão ${secureEsperado ? "com" : "sem"} Secure`, login.cookie.includes("Secure") === secureEsperado);

  const sessao = login.cookie.split(";")[0];
  if (etapa === "antes") writeFileSync(arquivoSessao, sessao);
  const categoria = await postJson("/api/categories", { name: `Categoria ${etapa}` }, sessao);
  conferir("categoria criada pela API (201)", categoria.status === 201);
  const lista = JSON.parse((await chamar("/api/categories", { headers: { Cookie: sessao } })).texto);
  const esperadas = etapa === "antes" ? 1 : 2;
  conferir(`${esperadas} categoria(s) salva(s) no volume`, lista.length === esperadas);
}

main().catch((erro) => {
  console.error(erro.message);
  process.exit(1);
});
