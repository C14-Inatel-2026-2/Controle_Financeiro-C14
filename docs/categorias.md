# Categorias (RF04)

As categorias pertencem a um usuário. A tabela `categorias` foi criada na
migration 5, com nome único por usuário. A mesma migration adicionou a coluna
opcional `movimentacoes.categoria_id`. Lançamentos antigos e importados de
faturas ficam com `categoria_id` NULL.

## Rotas

As duas rotas exigem sessão (veja a [autenticação](autenticacao.md#rotas-protegidas)).
O dono vem de `req.usuario.id`, nunca do corpo. O frontend chama
`/api/categories`, e a rota também responde sem o prefixo.

| Rota | Corpo | Respostas |
| --- | --- | --- |
| `GET /categories` | — | `200 [{ id, name }]` do usuário da sessão, em ordem de nome; `401 AUTHENTICATION_REQUIRED` |
| `POST /categories` | `{ "name": string }` | `201 { id, name }`; `400 VALIDATION_ERROR` (nome vazio ou que não é texto); `409 CATEGORY_ALREADY_EXISTS` (mesmo nome, após `trim`, para o mesmo usuário); `401` |

A regra de nome continua no `createCategoryService`, que já existia. Duas
contas podem ter categorias com o mesmo nome. Assim como nas metas, a
comparação diferencia maiúsculas ("Lazer" e "lazer" são categorias diferentes).

A tela `frontend/src/pages/Categorias.tsx` lista e cria categorias pela API.
Enquanto a tela de login não criar a sessão, ela mostra "Faça login para ver
suas categorias." (veja o [login pela tela](autenticacao.md#pendente-login-pela-tela)).

## Movimentações com categoria

As rotas de movimentações vieram do PR #34 (Igor), em
`backend/src/routes/movimentacoes.ts`. As duas exigem sessão e respondem em
`/api/movimentacoes` e em `/movimentacoes`.

| Rota | Corpo | Respostas |
| --- | --- | --- |
| `GET /movimentacoes` | — | `200 [{ id, descricao, tipo, valorEmCentavos, data, categoriaId }]` só do usuário da sessão, por data e id; `401` |
| `POST /movimentacoes` | `{ descricao, tipo: "receita" \| "despesa", valorEmCentavos, data: "AAAA-MM-DD", categoriaId? }` | `201 { id }`; `400 VALIDATION_ERROR` ("Dados da movimentação inválidos."); `404 CATEGORY_NOT_FOUND` (categoria inexistente **ou** de outra conta, mesma resposta); `401` |

- `valorEmCentavos` é um inteiro seguro maior ou igual a zero. A data precisa
  existir no calendário.
- `categoriaId` é opcional. Ausente ou `null`, o lançamento fica sem categoria.
- Um `usuarioId` no corpo é ignorado.
- Não há tela de movimentações: hoje o acesso é só pela API.

Testes: `backend/tests/integration/movimentacoes-http.test.ts` cobre os dois
caminhos (`/movimentacoes` e `/api/movimentacoes`): exigência de login, gravação
com e sem categoria, listagem isolada por conta e rejeição de categoria alheia
ou inexistente sem gravar nada.

### No repositório

O repositório `criarRepositorioMovimentacoes` (PR #8) aceita o campo opcional
`categoriaId` em `NovaMovimentacao`:

- `undefined` ou `null`: grava com `categoria_id` NULL. O SQL é exatamente o
  de antes, então a importação de faturas e os testes existentes não mudam.
- Um número: antes de gravar, `validarCategoriaDoUsuario` confere se a
  categoria existe **e** pertence ao mesmo `usuarioId`. Se não, lança
  `ValidationError("Categoria não encontrada.", "categoriaId")`.
  Categoria inexistente e categoria de outra conta recebem o mesmo erro.
- Um valor que não é inteiro positivo lança
  `ValidationError(..., "categoriaId")`.

`listar(usuarioId)` devolve cada lançamento com `categoriaId`. Para os
lançamentos sem categoria, o valor é `null` (o campo sempre aparece):

```json
[
  { "id": 1, "descricao": "Feira", "tipo": "despesa", "valorEmCentavos": 4500, "data": "2026-11-01", "categoriaId": 10 },
  { "id": 2, "descricao": "Salário", "tipo": "receita", "valorEmCentavos": 500000, "data": "2026-11-05", "categoriaId": null }
]
```

A rota `GET` devolve esse resultado como está. O nome da categoria não vem
junto: uma futura tela cruza `categoriaId` com a lista de `GET /categories`.
Os testes do repositório estão em `backend/tests/integration/categories.test.ts`.

## Ainda falta

- Tela de movimentações, com escolha da categoria.
- Totais por categoria (resumo do RF07).
- Login pela tela, para a tela de categorias funcionar sem contorno.
