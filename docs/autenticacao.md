# Autenticação (RF02)

O login cria uma sessão guardada no banco (tabela `sessoes`, migration 4; arquivo SQLite local ou Turso na hospedagem) e
envia o identificador dela num cookie. O navegador guarda e reenvia esse cookie
sozinho. O JavaScript da tela não lê nem guarda token nenhum.

## Rotas

Todas as rotas da API respondem com o prefixo `/api`, usado pelo frontend e
pela imagem Docker (por exemplo, `POST /api/auth/login`), e também sem ele,
por compatibilidade.

| Rota | Corpo | Respostas |
| --- | --- | --- |
| `POST /auth/login` | `{ "email": string, "senha": string }` | `200 { id, nome, email }` + cookie `sessao`; `400 VALIDATION_ERROR` (campo ausente, vazio ou não texto, com `campo`); `401 INVALID_CREDENTIALS` (senha errada **ou** e-mail inexistente, mesma mensagem); `500 INTERNAL_ERROR` |
| `POST /auth/logout` | — | `204`. Apaga a sessão no banco e limpa o cookie. Responde 204 também sem sessão. |
| `GET /auth/me` | — | `200 { id, nome, email }` do dono da sessão; `401 AUTHENTICATION_REQUIRED` |

O e-mail é normalizado como no cadastro (`normalizarEmail`). A senha é conferida
contra o `senha_hash` no formato `scrypt:<salt>:<hash>` gravado pelo cadastro.
O hash é lido só pela consulta interna `criarRepositorioCredenciais` e nunca vai
para uma resposta.

## Cookie e sessão

- Nome `sessao`, `HttpOnly`, `SameSite=Lax`, `Path=/`, expira em 8 horas
  (`DURACAO_SESSAO_MS` em `backend/src/repositories/sessoes.ts`).
- `Secure` é ligado quando `NODE_ENV=production`. Nesse ambiente a API deve
  estar atrás de HTTPS. Para testar a imagem por HTTP, defina
  `COOKIE_SECURE=false` sem mexer no `NODE_ENV`. `COOKIE_SECURE=true` força o
  `Secure`, e outro valor impede o servidor de subir (`backend/src/config.ts`).
  Veja o [guia do deploy](ci-cd/deploy.md#cookie-da-sessão-por-http).
- O banco guarda só o SHA-256 do token. Sessões vencidas deixam de valer na
  hora e são apagadas a cada novo login.

## Rotas protegidas

`createApp` monta as rotas num `Router` da API, nesta ordem:

1. `carregarSessao`: com uma sessão válida, a requisição ganha
   `req.usuario = { id: number }`;
2. `/invoice-imports`, que lê o próprio corpo;
3. `express.json()` e as rotas de `/health`;
4. `/movimentacoes`, `/auth`, `/categories`, `/goals` e `/users`.

Esse `Router` é montado em `/api` e depois na raiz. Entre os dois ficam o 404
em JSON para qualquer `/api/...` desconhecido e o frontend estático da imagem
(`FRONTEND_DIR`).

Para proteger uma rota, use `exigirSessao`, que responde
`401 AUTHENTICATION_REQUIRED` quando não há sessão. O ID do usuário vem **só**
de `req.usuario.id`: qualquer `usuarioId` enviado no corpo, na URL ou em
cabeçalhos é ignorado.

Usam esse contrato hoje:

- **Movimentações** (`backend/src/routes/movimentacoes.ts`, PR #34): `GET` e
  `POST /movimentacoes` exigem sessão. Veja
  [movimentações com categoria](categorias.md#movimentações-com-categoria).
- **Categorias:** `GET` e `POST /categories`.
- **Confirmação de faturas:** `createAppComBanco` passa
  `invoiceIdentity: (req) => req.usuario?.id`. A prévia continua pública, e a
  confirmação sem sessão responde `401 AUTHENTICATION_REQUIRED`.

## Login pela tela

O frontend usa a API acima pelo `ServicoDeAutenticacao`
(`frontend/src/services/ServicoDeAutenticacao.ts`), com os métodos `entrar`,
`usuarioAtual` e `sair`. Senha e token não são guardados no `localStorage` nem
em outro lugar do navegador. A sessão é só o cookie `HttpOnly`. As chamadas
usam caminhos relativos (`/api/...`), então o `fetch` envia o cookie por ser
mesma origem, tanto pelo proxy do Vite em `npm run dev` quanto na imagem, que
serve o frontend junto da API. Se a API um dia ficar em outra origem, será
preciso `credentials: "include"` e CORS com credenciais.

- **Login** (`frontend/src/pages/Login.tsx`): confere o preenchimento e envia
  `POST /api/auth/login`. Só entra na área interna com `200`. `401` (senha
  errada ou e-mail inexistente) e `400` mostram `erro.mensagem` da API, por
  exemplo "E-mail ou senha incorretos.", e a pessoa continua no login. Falha de
  rede ou outro status mostra "Não foi possível entrar. Tente novamente." e
  libera o botão para uma nova tentativa. Durante o envio, o botão fica
  desabilitado ("Entrando...").
- **Ao abrir o app** (`frontend/src/App.tsx`): `GET /api/auth/me` decide a
  tela. Enquanto a resposta não chega, só aparece "Carregando...". Com `200`, o
  usuário fica no estado do App e a Home abre, inclusive depois de F5. Com
  `401` ou API fora do ar, a página inicial pública abre.
- **Telas internas** (Início, Dashboard, Categorias e Importar fatura) só
  abrem com usuário no estado. Sem ele, o App mostra o login.
- **Sair** (no topo): `POST /api/auth/logout`. Com a resposta `204`, o App
  limpa o usuário e mostra o login. Se a saída falhar, a pessoa continua
  conectada e o topo mostra o erro. As telas internas são desmontadas ao sair,
  então a próxima conta não vê os dados carregados pela anterior.
- **Sessão expirada:** quando uma chamada protegida responde `401` (listar ou
  criar categorias, confirmar fatura), o serviço lança `SessaoExpiradaError`. A
  tela avisa o App, que limpa o usuário e volta ao login com "Sua sessão
  expirou. Entre novamente.". O `401` do próprio login não usa esse erro e só
  mostra a mensagem de credenciais inválidas.
- **Nome da conta:** o topo mostra o primeiro nome e as iniciais do usuário
  (primeira letra do primeiro e do último nome: "Ana Teste" → "AT"), e a Home
  mostra "Olá, Ana.".

- **Logo e Voltar ao início:** o logo "Controle Financeiro" é um botão
  (`frontend/src/components/Logo.tsx`). Nas telas internas, inclusive Importar
  fatura, leva ao Início sem encerrar a sessão. No Login e no Cadastro, leva à
  página inicial pública, assim como o botão "← Voltar ao início" do formulário,
  que continua visível no celular, onde o painel do logo fica oculto.

A navegação continua guardada na memória do App, sem endereço por tela. Depois
de F5 a pessoa volta à Home, não à tela em que estava, e o Voltar do navegador
não troca de tela.

Testes: `frontend/src/services/ServicoDeAutenticacao.test.ts` (contrato das três
rotas), `frontend/src/pages/Login.test.tsx` (login válido, credenciais
inválidas, falha de rede com nova tentativa e envio repetido) e
`frontend/src/App.test.tsx` (sessão ao abrir, área interna bloqueada, Sair, troca
de conta, falha no logout, sessão expirada, logo e Voltar ao início).

## Fora do escopo desta entrega

Limite de tentativas de login, renovação automática da sessão e troca de senha.
