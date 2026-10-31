# US05 — Acompanhar metas financeiras

O fluxo reutiliza `createGoal` e `createGoalService`: o nome recebe trim e é
obrigatório; o valor-alvo é um inteiro seguro em centavos maior que zero.
Nomes duplicados continuam sendo comparados exatamente, diferenciando maiúsculas.

## Persistência e API

A migration 2 cria `metas` sem modificar os registros de usuários e movimentações.
O servidor abre o SQLite com `abrirBanco` e injeta o repositório na aplicação.
O caminho padrão é `data/financeiro.sqlite`, relativo ao diretório de execução;
`DATABASE_PATH` permite configurar outro arquivo. Use o mesmo caminho entre reinícios.

- `POST /goals`: recebe `{ "name": "Viagem", "targetAmountInCents": 100000 }`.
  Retorna 201 com a meta e `progressAmountInCents: 0` somente após gravar.
- `GET /goals`: retorna uma lista de metas com os mesmos campos, ou `[]`.
- Dados inválidos retornam 400; nome duplicado, 409; falha de persistência ou
  consulta, 500. Erros seguem o formato `{ "erro": { "codigo": "…", "mensagem": "…" } }`.

## Decisão sobre progresso

A inspeção do módulo de metas não encontrou aportes, valor acumulado, vínculo com
movimentações ou regra de cálculo. O saldo existente refere-se às movimentações
do usuário e não possui vínculo com metas. Assim, a regra desta entrega é:
**sem aportes definidos no modelo, o progresso atual é zero**.
O backend fornece `progressAmountInCents: 0` tanto no cadastro quanto na consulta;
o frontend exibe esse valor em reais e na barra de progresso, sem recalcular saldo.
Não foi criado um mecanismo de aportes nem de distribuição de saldo entre metas.

O projeto ainda não tem autenticação: as metas seguem o escopo global do módulo
atual, sem aceitar um identificador de usuário fornecido pelo cliente. Isolamento
por usuário depende da história de autenticação e não faz parte desta entrega.

## Interface e execução local

1. Em `backend/`, execute `npm ci` e `npm run dev` (Node com `node:sqlite`).
2. Em `frontend/`, execute `npm ci` e `npm run dev`.
3. Abra o endereço do Vite e escolha **Metas financeiras** (`/#metas`).

No PowerShell com scripts desabilitados, use `npm.cmd` no lugar de `npm`.
O frontend usa `/api/goals`; o proxy já existente do Vite encaminha para
`http://localhost:3000/goals`. Em uma publicação estática, o servidor deve manter
esse encaminhamento de `/api` para o backend.

O formulário converte reais para centavos sem arredondamento e aguarda a resposta
da API antes de confirmar sucesso. Uma resposta inválida também é erro. A lista
é consultada novamente ao abrir a tela; não usa armazenamento local como fonte de dados.

## Verificação

- Backend: `npm test` e `npm run build`.
- Frontend: `npm test`, `npm run build` e `npm run lint`.

Os testes cobrem domínio, propagação de falha no serviço, API com SQLite em arquivo,
reabertura da conexão, atualização da migration 1, duplicidade, erros HTTP, conversão
monetária e interface (consulta, cadastro, progresso zero e ausência de falso sucesso).

Execução em 31/10/2026: 81 testes do backend e 36 do frontend passaram.
Os builds dos dois projetos, o lint do frontend e `git diff --check` passaram.
Os testes de interface usam jsdom e API simulada; o teste de integração do backend
usa o SQLite real em arquivo temporário. Não foi feita validação manual em navegador.

## Arquivos desta entrega

- `README.md`
- `backend/src/app.ts`
- `backend/src/server.ts`
- `backend/src/database/conexao.ts`
- `backend/src/database/README.md`
- `backend/src/features/goals/domain/goal.ts`
- `backend/src/features/goals/domain/goal-repository.ts`
- `backend/src/features/goals/infrastructure/sqlite-goal-repository.ts`
- `backend/src/routes/goalRoutes.ts`
- `backend/tests/integration/goals.test.ts`
- `backend/tests/integration/health.test.ts`
- `backend/tests/unit/goals/goal.test.ts`
- `backend/tests/unit/goals/create-goal-service.test.ts`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/pages/Metas.tsx`
- `frontend/src/pages/Metas.test.tsx`
- `frontend/src/services/ServicoDeMetas.ts`
- `frontend/src/services/ServicoDeMetas.test.ts`
- `frontend/src/utils/validarMeta.ts`
- `frontend/src/utils/validarMeta.test.ts`
- `docs/us05-metas-financeiras.md`
