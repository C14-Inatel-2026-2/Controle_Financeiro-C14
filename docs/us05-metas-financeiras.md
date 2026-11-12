# US05 — Acompanhar metas financeiras

## Escopo do backend

O backend permite criar e listar metas persistidas no SQLite, vinculadas ao usuário
obtido da sessão autenticada. A integração da interface está sob responsabilidade
do Caio, em trabalho separado.

O fluxo reutiliza `createGoal` e `createGoalService`: o nome recebe trim e é
obrigatório; o valor-alvo deve ser um inteiro seguro em centavos maior que zero.
A comparação de nomes continua sensível a maiúsculas: `Viagem` e `viagem` são
metas diferentes. O mesmo nome é permitido em contas diferentes.

## Autenticação e API

As rotas funcionam com e sem o prefixo `/api`. Exigem o cookie `sessao`, emitido
por `POST /auth/login`. `carregarSessao` carrega a identidade e `exigirSessao`
protege todas as rotas de metas.

- `POST /goals` ou `POST /api/goals`: recebe
  `{ "name": "Viagem", "targetAmountInCents": 100000 }`.
  Retorna 201 com os mesmos campos e `progressAmountInCents: 0` após persistir.
- `GET /goals` ou `GET /api/goals`: retorna apenas as metas da sessão atual,
  em ordem de cadastro, com os mesmos campos, ou `[]`.
- Sessão ausente, inválida, expirada ou revogada retorna 401 com
  `AUTHENTICATION_REQUIRED`.
- Dados inválidos retornam 400 com `VALIDATION_ERROR`.
- Nome duplicado após trim na mesma conta retorna 409 com `GOAL_ALREADY_EXISTS`.
- Falhas de persistência ou consulta retornam 500 com `INTERNAL_ERROR`.

Os erros seguem `{ "erro": { "codigo": "…", "mensagem": "…" } }`.
O proprietário vem exclusivamente de `req.usuario.id`. Identificadores enviados
no corpo, query string ou cabeçalhos não selecionam outra conta.
`createApp({ metasDoUsuario, autenticacao })` recebe uma fábrica de repositórios
por usuário; `createAppComBanco` configura essa fábrica e as sessões SQLite.
Todas as consultas e inserções do repositório de metas usam o usuário da sessão.
Não há rotas de edição, exclusão ou aportes nesta entrega.

## Migração e persistência

A migration 2 permanece inalterada. A migration 6 reconstrói a tabela `metas`
em uma transação e acrescenta `usuario_id REFERENCES usuarios(id)` e
`UNIQUE(usuario_id, nome)`, substituindo a unicidade global do nome.
As validações de nome e valor-alvo são mantidas no SQLite.

IDs, nomes e valores existentes são preservados com `usuario_id NULL`: não há
informação confiável sobre seus proprietários. Essas metas antigas não aparecem
para nenhuma conta, nem impedem uma conta de cadastrar o mesmo nome. O backend
sempre fornece um usuário ao criar metas novas; a coluna aceita NULL para
preservar o legado. Atribuir essas metas exige uma decisão futura com informação
confiável, sem distribuição automática ou arbitrária.

`abrirBanco` habilita chaves estrangeiras e aplica as migrations. A versão 6 é
registrada somente após a reconstrução; falhas revertem a transação inteira.
Execuções repetidas não recriam a tabela nem alteram registros já migrados.
A chave estrangeira rejeita donos inexistentes e impede excluir usuários que
possuam metas vinculadas. Não há exclusão em cascata de metas.

O arquivo padrão é `data/financeiro.sqlite`, relativo à pasta de execução.
`DATABASE_PATH` permite escolher outro arquivo. Use o mesmo caminho entre reinícios.

## Progresso e pendências

`progressAmountInCents` permanece temporariamente em zero na criação e listagem.
O sistema ainda não tem regra de aportes ou vínculo entre movimentações e metas;
o saldo do usuário não é distribuído automaticamente. Zero preserva o contrato
atual e não representa um cálculo de evolução financeira.

A equipe precisa decidir a origem dos aportes, como vinculá-los a uma meta,
como tratar retiradas e estornos e se haverá alguma relação com movimentações.
Após essa definição, será necessário implementar persistência, operações e cálculo
do progresso. Também ficam pendentes a integração da interface e uma eventual
política de identificação dos proprietários das metas legadas.

## Execução e verificação

Em `backend/`, use `npm run dev` com Node.js que disponibilize `node:sqlite`.
No PowerShell com scripts desabilitados, use `npm.cmd` no lugar de `npm`.
Exemplo para uma conta já cadastrada:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType 'application/json' -Body '{"email":"ana@example.test","senha":"senha-de-teste"}' -SessionVariable sessao
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/goals -WebSession $sessao -ContentType 'application/json' -Body '{"name":"Viagem","targetAmountInCents":100000}'
Invoke-RestMethod -Uri http://localhost:3000/api/goals -WebSession $sessao
```

A interface deve enviar o cookie da sessão nas requisições, valores em centavos,
aguardar a confirmação da API e apresentar as falhas retornadas.

```text
npm run build
npm test
npm test -- tests/integration/goals.test.ts tests/integration/goals-auth.test.ts tests/integration/goals-migration.test.ts tests/unit/goals
```

Os testes cobrem domínio e serviço, autenticação, isolamento, tentativas de forjar
a identidade, duplicidade por usuário, persistência após reabrir o SQLite,
preservação do legado, integridade referencial, repetição e rollback da migração.
A suíte completa também verifica a coexistência com usuários, health, categorias,
movimentações e importação de faturas. Não são testes de interface.
