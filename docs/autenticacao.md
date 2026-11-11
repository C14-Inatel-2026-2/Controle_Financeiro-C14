# Autenticação (RF02) — backend

O login cria uma sessão guardada no SQLite (tabela `sessoes`, migration 4) e
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

## Pendente: login pela tela

A API de login está pronta e é testada, inclusive dentro da imagem Docker, mas
a tela `frontend/src/pages/Login.tsx` ainda não a chama: ela só confere o
preenchimento e libera a navegação. Sem sessão, a tela de categorias e a
confirmação de faturas respondem 401. O contorno para demonstrações está no
[guia rápido do deploy](ci-cd/deploy.md#limitações-para-quem-for-demonstrar).

O que a tela precisa fazer:

1. Enviar `POST /api/auth/login` com `Content-Type: application/json` e
   `{ email, senha }`. Na mesma origem, que é o caso do proxy `/api` do Vite,
   o `fetch` já envia e guarda o cookie. Se a API ficar em outra origem, use
   `credentials: "include"`.
2. `200`: o corpo traz `{ id, nome, email }`. Navegar para a área interna.
3. `401`: mostrar "E-mail ou senha incorretos." (vem em `erro.mensagem`).
4. `400`: mostrar `erro.mensagem` junto do campo indicado em `erro.campo`.
5. Outro status ou falha de rede: mensagem geral, por exemplo "Não foi possível
   entrar. Tente novamente.".
6. Desabilitar o botão enquanto a requisição estiver em andamento, como na
   tela de cadastro.
7. Ao abrir o app, `GET /api/auth/me` diz se ainda há sessão: `200` com o
   usuário ou `401`.
8. Botão "Sair": `POST /api/auth/logout` e voltar para a tela inicial.
9. Qualquer chamada protegida que responda `401` (sessão expirada) deve levar
   de volta ao login.

## Fora do escopo desta entrega

Limite de tentativas de login, renovação automática da sessão e troca de senha.
