# Autenticação (RF02) — backend

O login cria uma sessão guardada no SQLite (tabela `sessoes`, migration 4) e
envia o identificador dela num cookie. O navegador guarda e reenvia esse cookie
sozinho. O JavaScript da tela não lê nem guarda token nenhum.

## Rotas

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
  estar atrás de HTTPS. O deploy local do Jenkins roda por HTTP e não define
  `NODE_ENV`, então funciona sem `Secure`.
- O banco guarda só o SHA-256 do token. Sessões vencidas deixam de valer na
  hora e são apagadas a cada novo login.

## Contrato para rotas protegidas (Igor: movimentações)

`createApp` roda `carregarSessao` antes de todas as rotas. Com uma sessão
válida, a requisição chega com `req.usuario = { id: number }`. Para proteger
uma rota, use `exigirSessao`, que responde `401 AUTHENTICATION_REQUIRED`
quando não há sessão:

```typescript
import { exigirSessao } from "../middlewares/sessao.js";

router.use(exigirSessao);
router.get("/", (req, res) => {
  res.json(movimentacoes.listar(req.usuario!.id));
});
router.post("/", (req, res) => {
  // req.body traz descricao, tipo, valorEmCentavos e data, nunca usuarioId.
  const id = movimentacoes.inserir(req.usuario!.id, dados);
  res.status(201).json({ id });
});
```

- O ID do usuário vem **só** de `req.usuario.id`. Ignore qualquer `usuarioId`
  enviado no corpo, na URL ou em cabeçalhos.
- O repositório `criarRepositorioMovimentacoes` (PR #8) não muda: `inserir` e
  `listar` já recebem o ID do usuário.
- Monte o router depois de `app.use(express.json())` em `createApp` e passe o
  repositório por `createAppComBanco`, como as outras rotas.

A confirmação de faturas já usa esse contrato: `createAppComBanco` passa
`invoiceIdentity: (req) => req.usuario?.id`. A prévia continua pública, e a
confirmação sem sessão responde `401 AUTHENTICATION_REQUIRED`.

## O que a tela `Login.tsx` precisa fazer

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
