# Categorias (RF04)

As categorias pertencem a um usuário. A tabela `categorias` foi criada na
migration 5, com nome único por usuário. A mesma migration adicionou a coluna
opcional `movimentacoes.categoria_id`. Lançamentos antigos e importados de
faturas ficam com `categoria_id` NULL.

## Rotas

As duas rotas exigem sessão (veja `docs/autenticacao.md`). O dono vem de
`req.usuario.id`, nunca do corpo.

| Rota | Corpo | Respostas |
| --- | --- | --- |
| `GET /categories` | — | `200 [{ id, name }]` do usuário da sessão, em ordem de nome; `401 AUTHENTICATION_REQUIRED` |
| `POST /categories` | `{ "name": string }` | `201 { id, name }`; `400 VALIDATION_ERROR` (nome vazio ou que não é texto); `409 CATEGORY_ALREADY_EXISTS` (mesmo nome, após `trim`, para o mesmo usuário); `401` |

A regra de nome continua no `createCategoryService`, que já existia. Duas
contas podem ter categorias com o mesmo nome. Assim como nas metas, a
comparação diferencia maiúsculas ("Lazer" e "lazer" são categorias diferentes).

## Ponto de ligação para a rota de movimentações (Igor)

O repositório `criarRepositorioMovimentacoes` (PR #8) aceita agora o campo
opcional `categoriaId` em `NovaMovimentacao`:

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

A rota `GET` de movimentações pode devolver esse resultado como está. O
nome da categoria não vem junto: a tela cruza `categoriaId` com a lista de
`GET /categories`. Os testes `database.test.ts` e `movimentacoes.unit.test.ts`
já foram ajustados para esse formato.

Na rota, basta repassar o campo do corpo e traduzir o `ValidationError`, como
o `createUserController` já faz:

```typescript
router.post("/", exigirSessao, (req, res) => {
  try {
    const id = movimentacoes.inserir(req.usuario!.id, {
      descricao: req.body.descricao,
      tipo: req.body.tipo,
      valorEmCentavos: req.body.valorEmCentavos,
      data: req.body.data,
      categoriaId: req.body.categoriaId, // opcional
    });
    res.status(201).json({ id });
  } catch (erro) {
    if (erro instanceof ValidationError) {
      res.status(400).json({ erro: { codigo: "VALIDATION_ERROR", mensagem: erro.message, campo: erro.campo } });
      return;
    }
    res.status(500).json({ erro: { codigo: "INTERNAL_ERROR", mensagem: "Não foi possível salvar a movimentação." } });
  }
});
```

Ainda falta, na parte do Igor:

1. A rota acima, com a validação dos outros campos. Hoje o repositório só
   valida o valor, e o banco rejeita tipo e data inválidos.
2. Os testes HTTP da rota: com categoria válida, inexistente, de outra conta
   e sem categoria, e a listagem com `categoriaId`. Os testes do repositório
   já estão em `backend/tests/integration/categories.test.ts`.
