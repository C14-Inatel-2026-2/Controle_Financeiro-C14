# US05 — Acompanhar metas financeiras

## Escopo do backend

O backend permite criar e listar metas e registrar aportes no libSQL (local ou
Turso), vinculados ao usuário da sessão. A tela Metas está disponível no menu e
no atalho da Início, com cadastro, aportes e acompanhamento do progresso.

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
  Retorna 201 com os mesmos campos, `id` estável e `progressAmountInCents: 0` após persistir.
- `GET /goals` ou `GET /api/goals`: retorna apenas as metas da sessão atual,
  em ordem de cadastro, com `id`, nome, valor-alvo e acumulado real, ou `[]`.
- `POST /goals/:id/contributions` (também com `/api`): recebe
  `{ "amountInCents": 10000 }`, um inteiro seguro positivo em centavos, e retorna
  201 com a meta atualizada. O proprietário vem exclusivamente da sessão.
- ID ou aporte inválido retorna 400 com `VALIDATION_ERROR`; meta inexistente ou
  alheia retorna 404 com `GOAL_NOT_FOUND`; estouro do acumulado retorna 409 com
  `GOAL_PROGRESS_LIMIT`, sem gravar o aporte.
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
Não há rotas de edição, exclusão, retirada ou estorno nesta entrega.

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

`abrirBanco` habilita chaves estrangeiras e aplica as migrations. A versão 6 roda num
`batch` "write" do libSQL e é registrada somente após a reconstrução; falhas revertem
a transação inteira.
Execuções repetidas não recriam a tabela nem alteram registros já migrados.
A chave estrangeira rejeita donos inexistentes e impede excluir usuários que
possuam metas vinculadas. Não há exclusão em cascata de metas.

A migration 7 acrescenta `aportes_metas`, preservando as migrations anteriores e
os dados existentes. Uma chave estrangeira composta vincula o aporte à meta e ao
proprietário. Um `batch` "write" verifica o limite, grava condicionalmente e lê o
acumulado atomicamente, inclusive sob concorrência. Um trigger também impede
estouro por inserções diretas. A nova migration tem repetição e rollback testados.

O arquivo padrão é `data/financeiro.sqlite`, relativo à pasta de execução.
`DATABASE_PATH` permite escolher outro arquivo. Use o mesmo caminho entre reinícios.
Na hospedagem, as metas ficam no Turso, como os demais dados ([guia do banco](../backend/src/database/README.md)).

## Progresso e pendências

A regra mínima foi escolhida na solicitação desta implementação para a entrega;
isso não constitui registro de aprovação formal pela equipe.

`progressAmountInCents` é a soma dos aportes positivos da meta. Sem aportes, vale
zero. Aportes não geram receitas ou despesas e não alteram o saldo geral.
O acumulado pode ultrapassar o alvo, até `Number.MAX_SAFE_INTEGER` centavos.
A tela calcula `acumulado / valor-alvo * 100`, exibe o percentual real com até
duas casas decimais e limita apenas a barra visual a 100%.

A interface converte reais para centavos concatenando dígitos, sem multiplicar
valores decimais em ponto flutuante. Aceita vírgula ou ponto decimal com até duas
casas e sem separador de milhar. Um 401 volta ao login. O envio repetido fica
bloqueado enquanto a operação está pendente; a API não oferece chave de
idempotência para repetir uma chamada após uma resposta perdida na rede.

Retiradas, estornos, edição, exclusão e vínculo com movimentações ficam fora
desta entrega. A atribuição das metas legadas sem dono segue pendente.

## Execução e verificação

Em `backend/`, use `npm run dev` com Node.js 24 (o banco usa o cliente libSQL).
No PowerShell com scripts desabilitados, use `npm.cmd` no lugar de `npm`.
Exemplo para uma conta já cadastrada:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType 'application/json' -Body '{"email":"ana@example.test","senha":"senha-de-teste"}' -SessionVariable sessao
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/goals -WebSession $sessao -ContentType 'application/json' -Body '{"name":"Viagem","targetAmountInCents":100000}'
Invoke-RestMethod -Uri http://localhost:3000/api/goals -WebSession $sessao
```

Use o `id` retornado para aportar, substituindo `1` pelo ID da sua meta:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/goals/1/contributions -WebSession $sessao -ContentType 'application/json' -Body '{"amountInCents":10000}'
```

A interface deve enviar o cookie da sessão nas requisições, valores em centavos,
aguardar a confirmação da API e apresentar as falhas retornadas.

```text
npm run build
npm test
npm test -- tests/integration/goals.test.ts tests/integration/goals-auth.test.ts tests/integration/goals-migration.test.ts tests/integration/goals-contributions.test.ts tests/unit/goals
```

Os testes cobrem domínio e serviço, autenticação, isolamento, tentativas de forjar
a identidade, duplicidade por usuário, persistência após reabrir o SQLite,
preservação do legado, integridade referencial, repetição e rollback da migração.
A suíte completa também verifica a coexistência com usuários, health, categorias,
movimentações e importação de faturas. Os testes novos cobrem soma, persistência e
isolamento dos aportes, limite sob concorrência e rollback da migration 7. No
frontend, `Metas.test.tsx`, `ServicoDeMetas.test.ts` e `centavosDeReais.test.ts`
cobrem tela, HTTP e conversão. `App.test.tsx` confere o atalho e o retorno por 401.
