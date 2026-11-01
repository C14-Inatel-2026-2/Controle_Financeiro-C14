# US05 — Acompanhar metas financeiras

## Escopo desta contribuição

Entrega somente do backend mínimo: criar e listar metas, persistir no SQLite e
validar nome obrigatório e valor-alvo positivo. A interface de metas será integrada
pelo Donnato em trabalho separado. As telas existentes dos colegas são preservadas.
Esta contribuição não entrega a história completa de ponta a ponta.

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
O backend mantém `progressAmountInCents: 0` tanto no cadastro quanto na consulta
para preservar o contrato existente. **Progresso dinâmico não está implementado**:
não há registro de aportes nem distribuição do saldo entre metas. Esse zero não
representa um cálculo de evolução financeira.

O projeto ainda não tem autenticação: as metas seguem o escopo global do módulo
atual, sem aceitar um identificador de usuário fornecido pelo cliente. Isolamento
por usuário depende da história de autenticação e não faz parte desta entrega.

## Execução local e integração futura

Em `backend/`, execute `npm ci` e `npm run dev` com Node.js 22.13 ou superior
com `node:sqlite` disponível. A API atende em `http://localhost:3000`.

No PowerShell com scripts desabilitados, use `npm.cmd` no lugar de `npm`.
Exemplo de cadastro e consulta no PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/goals -ContentType 'application/json' -Body '{"name":"Viagem","targetAmountInCents":100000}'
Invoke-RestMethod -Uri http://localhost:3000/goals
```

Na integração da interface pelo Donnato, o proxy existente do Vite permite usar
`/api/goals`, encaminhando para `/goals` no backend. A interface deve enviar
valores em centavos, aguardar a confirmação da API e apresentar falhas como erro.
Não há uma tela de metas ou rota `/#metas` entregue nesta contribuição.

`createApp({ goalCatalog, criarUsuario })` mantém as dependências independentes.
O servidor configura o catálogo SQLite. As rotas `/users` e `/health` da `main`
são preservadas, incluindo 503 com `USER_REGISTRATION_UNAVAILABLE` se o serviço
de cadastro de usuários não estiver configurado.

## Verificação

- Backend: `npm test` e `npm run build`.

Os testes cobrem domínio, propagação de falha no serviço, API com SQLite em arquivo,
reabertura da conexão, atualização da migration 1, duplicidade e erros HTTP.
Os testes de integração também verificam a coexistência de metas, usuários e
health, com e sem serviço de cadastro. Não são testes de interface.

Validação em 31/10/2026: os 109 testes do backend e o build passaram. Como
verificação de preservação do frontend dos colegas, seus 7 testes existentes e
o build também passaram; não houve alteração do frontend em relação à `main`.

Pendências da história completa: interface e tratamento de erros visuais, a serem
integrados pelo Donnato, e definição e implementação de progresso dinâmico.

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
- `backend/tests/integration/app.test.ts`
- `backend/tests/integration/goals.test.ts`
- `backend/tests/integration/health.test.ts`
- `backend/tests/integration/users.test.ts` (ajuste do chamador de `createApp`)
- `backend/tests/unit/goals/goal.test.ts`
- `backend/tests/unit/goals/create-goal-service.test.ts`
- `docs/us05-metas-financeiras.md`

O diff final desta contribuição em relação à `main` não deve alterar `frontend/`.
