# Controle_Financeiro-C14
Sistema web para controle financeiro desenvolvido para o projeto de Engenharia de Software C14

## Alunos e suas funções
- **Caio de Castro Yarouhas** - Líder do grupo / Backend
- **Donatto Pieve Costa Campos** - Frontend
- **Igor Augusto do Couto** - Banco de Dados / Backend
- **Gustavo Gago Lopes de Souza** - Backend 
- **José Matheus Gonçalves Rodrigues** - Backend

## Descrição da aplicação

O Controle Financeiro C14 é um sistema web de controle financeiro pessoal. O objetivo é permitir que uma pessoa registre receitas e despesas, organize os gastos por categoria, acompanhe o saldo, importe faturas de cartão de crédito e defina metas financeiras em um único lugar.

O público-alvo são pessoas que querem acompanhar as próprias finanças sem recorrer a planilhas, incluindo quem concentra gastos no cartão de crédito e precisa conferir as faturas.

O projeto é composto por:

- **Backend** (`backend/`): API em Node.js com Express e TypeScript, persistência SQLite pelo cliente oficial libSQL (`@libsql/client`): arquivo local no desenvolvimento e no Docker, Turso na hospedagem. Testes com Vitest.
- **Frontend** (`frontend/`): aplicação React com Vite e TypeScript.
- **Integração contínua** (`infra/jenkins/`, `Jenkinsfile`): Jenkins em Docker executando builds, testes e a publicação da imagem da aplicação no Docker Hub (`bunnyzzw/controle-financeiro-c14`).

A pasta `ui/` contém telas demonstrativas (protótipos visuais). Elas representam a interface pretendida e não correspondem a funcionalidades implementadas.

## Como usar

### Usar ou demonstrar a versão publicada

Basta ter Docker compatível com `linux/amd64`. Não é preciso clonar o projeto nem instalar Jenkins, Node ou npm. Siga o [guia rápido da imagem](docs/ci-cd/deploy.md#guia-rápido-executar-a-imagem-publicada), que usa a tag já publicada `5060557…`.

- O Docker Hub mantém a imagem disponível mesmo com o computador do Caio desligado.
- A aplicação roda no computador que inicia o contêiner. Cada instalação tem o próprio banco, guardado no volume `controle-financeiro-dados`.
- O Docker Hub só distribui a imagem. O site público fica no Render gratuito, com o banco no Turso: <https://controle-financeiro-c14.onrender.com>. Ele continua no ar com o PC do Caio desligado. Depois de um merge na `main`, o Jenkins local percebe o commit em até ~2 minutos (polling), roda a `pipeline-completa`, publica a imagem e pede o deploy ao Render. Para isso, o PC do Caio, o Docker Desktop e o Jenkins precisam estar ligados e com internet. Pushes em outras branches não atualizam o site. O Jenkins registra só que o Render aceitou o pedido: confira no painel do Render se a versão ficou Live ([guia](docs/ci-cd/deploy.md#publicar-uma-versão-nova)).
- Antes de apresentar, leia as [limitações para quem for demonstrar](docs/ci-cd/deploy.md#limitações-para-quem-for-demonstrar). A principal é que, na tag publicada, a tela de login ainda não chama a API. O login pela tela já está no código e entra na próxima imagem publicada.

### Desenvolver o projeto

É preciso ter Git e Node.js 24, a mesma versão principal do Jenkins. Em dois terminais PowerShell, a partir da raiz do repositório:

```powershell
# Terminal 1: API em http://localhost:3000, banco em backend\data\financeiro.sqlite
Set-Location .\backend
npm ci
npm run dev
```

```powershell
# Terminal 2: frontend em http://localhost:5173; o Vite repassa /api para a porta 3000
Set-Location .\frontend
npm ci
npm run dev
```

Sem variáveis do Turso, o backend usa o arquivo local. Defina `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` só para usar o banco remoto ([guia do banco](backend/src/database/README.md)). Antes de abrir um PR, rode `npm run test:unit`, `npm run test:integration`, `npm run test:coverage` e `npm run build` em `backend`, e `npm test`, `npm run lint` e `npm run build` em `frontend`. O arquivo do banco não é versionado. Guias por assunto: [autenticação](docs/autenticacao.md), [categorias e movimentações](docs/categorias.md), [metas](docs/us05-metas-financeiras.md) e [importação de faturas](backend/src/features/invoice-import/README.md).

### Executar o Jenkins e publicar novas imagens

O [guia do Jenkins](docs/jenkins/README.md) cobre a primeira instalação e a execução da `pipeline-completa`. O [guia do deploy](docs/ci-cd/deploy.md) explica o que é verificado antes da publicação.

- O Jenkins atual roda no PC do Caio e precisa desse computador ligado para executar novas pipelines. O grupo pode centralizar as publicações nessa instalação ou preparar outra com os arquivos do repositório e credenciais autorizadas ([quem pode executar e publicar](docs/jenkins/README.md#quem-pode-executar-e-publicar)).
- Atualizar os arquivos no GitHub não transfere usuários, segredos ou histórico de um Jenkins para outro. Cada instalação tem o próprio administrador e o próprio segredo de agente.
- Toda pipeline aprovada publica a tag do SHA. `latest` só é atualizada por uma pipeline na `main`, quando o SHA ainda é a ponta dela.

## Requisitos funcionais

Classificação revisada em 10/11/2026 sobre a `Branch-Caio` com a `main` integrada, incluindo as movimentações do PR #34, ainda no PR #35. A coluna "O que existe hoje" separa o que está ligado à interface do que só existe na API:

- **Implementado**: funciona de ponta a ponta para o usuário (interface, API e persistência, quando aplicáveis) e é coberto por testes.
- **Parcialmente implementado**: existem regras de negócio, API, persistência ou telas, mas o fluxo completo ainda não está disponível ao usuário pela interface.
- **Planejado**: ainda não há código correspondente.

As evidências de execução estão em [Requisitos não funcionais](#requisitos-não-funcionais).

| ID | Requisito | Situação | O que existe hoje | O que falta |
| --- | --- | --- | --- | --- |
| RF01 | Cadastro de usuários: a pessoa informa nome, e-mail e senha para criar uma conta; e-mails duplicados são rejeitados. | Implementado | Serviço de cadastro com validação de nome, formato de e-mail, senha com no mínimo 8 caracteres, normalização do e-mail e rejeição de duplicidade (`backend/src/services/createUserService.ts`); `POST /users` montado em `createAppComBanco` e gravando no SQLite (`backend/src/repositories/sqliteUserRepository.ts`), com respostas 201, 400 ou 409; tela de cadastro (`frontend/src/pages/Cadastro.tsx`) que valida localmente, chama a API pelo `ServicoDeCadastro`, mostra sucesso só após a resposta e então limpa os campos, mantém os dados quando a API recusa ou a rede falha, trata e-mail duplicado e falha geral e bloqueia envio repetido. Testes: `backend/tests/integration/cadastro-sqlite.test.ts` e `frontend/src/pages/Cadastro.test.tsx`. Cadastro também verificado dentro da imagem Docker. | Unificar ou remover o módulo alternativo `backend/src/features/users/` (veja RNF01). |
| RF02 | Login e autenticação: a pessoa entra com e-mail e senha e passa a acessar somente os próprios dados. | Parcialmente implementado | **API:** `POST /auth/login`, `POST /auth/logout` e `GET /auth/me` com sessão no SQLite e cookie `HttpOnly`; `req.usuario.id` protege categorias, movimentações e a confirmação de faturas ([docs/autenticacao.md](docs/autenticacao.md)). Login, cookie e sessão após a recriação do contêiner são verificados dentro da imagem. **Interface:** `Login.tsx` entra só depois do `200` da API e mostra a mensagem do 401; o App consulta `/auth/me` ao abrir, bloqueia as telas internas sem sessão, volta ao login quando uma chamada protegida responde 401 e mostra o nome da conta e "Sair" no topo ([login pela tela](docs/autenticacao.md#login-pela-tela)). Testes: `Login.test.tsx`, `App.test.tsx` e `ServicoDeAutenticacao.test.ts`; fluxo conferido no navegador em `npm run dev` e com o build servido pelo backend. | Execução no Jenkins e nova imagem com o login pela tela. As metas ainda não são separadas por usuário (veja RNF02). |
| RF03 | Registro e consulta de receitas e despesas: a pessoa cadastra movimentações com descrição, tipo, valor e data e consulta as que registrou. | Parcialmente implementado | **API:** `GET` e `POST /movimentacoes` (também em `/api`), com sessão, validação dos campos e listagem só do usuário da sessão (PR #34, [contrato](docs/categorias.md#movimentações-com-categoria)). Testes HTTP nos dois caminhos e verificação local da imagem. **Interface:** não há tela de movimentações; Home e Dashboard mostram dados de exemplo. | Telas de registro e consulta. Execução no Jenkins do commit integrado. |
| RF04 | Organização de gastos por categoria: a pessoa cria categorias e associa despesas a elas. | Parcialmente implementado | **API:** categorias por usuário no SQLite (migration 5), `GET` e `POST /categories` com a sessão e `categoriaId` opcional nas movimentações, com recusa de categoria inexistente ou de outra conta ([docs/categorias.md](docs/categorias.md)). **Interface:** tela de categorias ligada à API, com a sessão do [login pela tela](docs/autenticacao.md#login-pela-tela) (na tag publicada `5060557…`, só pelo [contorno de demonstração](docs/ci-cd/deploy.md#limitações-para-quem-for-demonstrar)). | Escolha de categoria numa tela de movimentações e totais por categoria. |
| RF05 | Cadastro de cartões de crédito: a pessoa registra os cartões que utiliza. | Planejado | Não há código de cartões. | Modelo, persistência, rotas e telas. |
| RF06 | Importação de faturas: a pessoa envia a fatura do cartão e revisa os lançamentos extraídos antes de salvá-los. | Parcialmente implementado | **API e interface:** tela de importação com prévia de PDF do Itaú (layout v1) e de CSV no template `data;descricao;valor`, pela rota pública `/invoice-imports/preview`. A confirmação grava os lançamentos como movimentações do usuário da sessão e evita importar a mesma fatura duas vezes ([guia da importação](backend/src/features/invoice-import/README.md)). | Associação com o cartão (RF05). |
| RF07 | Consulta de saldo e resumo financeiro: a pessoa vê o saldo (receitas menos despesas) e um resumo dos gastos. | Parcialmente implementado | Cálculo do saldo em centavos a partir das movimentações (`backend/src/services/calcularSaldo.ts`). O Dashboard tem layout, mas mostra valores fixos de exemplo. | Rota de saldo e ligar o Dashboard aos dados reais, com resumo por categoria e por período. |
| RF08 | Metas financeiras: a pessoa define metas com nome e valor-alvo e acompanha o progresso. | Parcialmente implementado | **API:** `POST` e `GET /goals`, com regras de nome e valor-alvo e persistência na tabela `metas` (migration 2) ([US05](docs/us05-metas-financeiras.md)). | Associação ao usuário (hoje as metas são compartilhadas por todas as contas), progresso e tela. |

## Requisitos não funcionais

Cada requisito separa três situações:

- **Pretendido**: a condição que o sistema deve atender.
- **Evidência por inspeção**: o que o código e os testes implementam, conforme leitura dos arquivos.
- **Comprovado por execução**: cada registro vale só para o commit indicado.
  - **Jenkins, 17/10/2026:** [pipeline completa na `main`](docs/jenkins/evidencias/pipeline-completa-main-2026-10-17.txt), commit `dbcc705`, cinco jobs em `SUCCESS`, ainda com o deploy antigo, sem imagem Docker.
  - **Jenkins do PC do Caio, commit `5060557` (`Branch-Caio`, antes das movimentações):** `pipeline-completa` #3 e `backend-deploy` #3 em `SUCCESS`, com a imagem publicada e conferida por digest ([registro](docs/ci-cd/deploy.md#evidências-registradas)).
  - **Verificação local, 10/11/2026, merge da `main` na `Branch-Caio` antes do commit:** backend com 164 testes unitários, 81 de integração e 245 na cobertura (89,29% das instruções); frontend com 40 testes; lint e builds sem erro. A imagem construída localmente passou na verificação do deploy, inclusive movimentações e persistência no volume.
  - **Pendente:** nova `pipeline-completa` na `Branch-Caio` após o commit do merge e, depois do merge do PR, na `main`.

Não há metas de desempenho, de cobertura mínima ou de disponibilidade definidas no projeto.

### RNF01 - Proteção de senhas

- **Pretendido**: nenhuma senha é armazenada ou devolvida em texto puro; o banco guarda apenas um hash com salt.
- **Evidência por inspeção**: o serviço de cadastro (`backend/src/services/createUserService.ts`) gera um salt aleatório e deriva o hash com `scrypt` (formato `scrypt:<salt>:<hash>`). A tabela `usuarios` possui apenas a coluna `senha_hash`, e a resposta do cadastro não inclui a senha. O teste unitário `backend/tests/unit/createUserService.test.ts` verifica que o repositório recebe somente o hash.
- **Comprovado por execução**: esse teste faz parte do job `backend-unit-igor`, concluído com sucesso na execução de 17/10/2026.
- **Evidência por inspeção (login)**: o login (`backend/src/services/loginService.ts`) confere a senha contra o mesmo formato `scrypt:<salt>:<hash>` com `timingSafeEqual`; `senha_hash` é lido só por uma consulta interna e não aparece nas respostas. Os testes `backend/tests/unit/auth/loginService.test.ts` e `backend/tests/integration/auth.test.ts` cobrem esse fluxo, ainda sem execução registrada no Jenkins.
- **Pendente**: o módulo alternativo `backend/src/features/users/` ainda trata a senha sem hash. Ele não é usado pela aplicação e precisa ser unificado ao serviço acima ou removido.

### RNF02 - Isolamento dos dados por usuário

- **Pretendido**: cada usuário acessa somente os próprios dados, e o identificador do usuário vem da autenticação, nunca do corpo da requisição.
- **Evidência por inspeção**: o repositório de movimentações filtra todas as consultas por `usuario_id`, e a chave estrangeira impede movimentações de usuário inexistente. O teste `backend/tests/integration/database.test.ts` verifica que as movimentações de um usuário não aparecem para outro.
- **Comprovado por execução**: esse teste faz parte do job `backend-integration-coverage`, concluído com sucesso na execução de 17/10/2026.
- **Evidência por inspeção (rotas com sessão)**: `/auth/me`, `/categories`, `/movimentacoes` e a confirmação de faturas tiram o usuário de `req.usuario.id` e ignoram `usuarioId` no corpo. Os testes de integração verificam o isolamento entre duas contas, inclusive a recusa de categoria de outra conta numa movimentação.
- **Comprovado por execução**: categorias e sessão no Jenkins do commit `5060557`; movimentações só na verificação local de 10/11/2026.
- **Pendente**: execução no Jenkins com as movimentações. As metas ainda não são associadas a usuários.

### RNF03 - Precisão monetária

- **Pretendido**: todo valor monetário é armazenado e calculado como inteiro seguro em centavos (`Number.isSafeInteger`), sem ponto flutuante. A conversão de reais para centavos ocorre na entrada dos dados, e a formatação em reais ocorre apenas na exibição, sem retornar aos cálculos.
- **Evidência por inspeção**: movimentações, saldo e metas validam valores com `Number.isSafeInteger`; o banco rejeita valores que não sejam inteiros (`CHECK (typeof(valor_em_centavos) = 'integer')`). A importação de faturas converte os valores lidos para centavos. Os testes unitários e o teste de integração do banco verificam a rejeição de valores negativos e de centavos fracionados.
- **Comprovado por execução**: esses testes fazem parte dos jobs `backend-unit-igor` e `backend-integration-coverage`, concluídos com sucesso na execução de 17/10/2026.
- **Pendente**: ainda não há formatação de valores em reais na interface.

### RNF04 - Persistência

- **Pretendido**: os dados financeiros permanecem salvos entre execuções e o esquema do banco evolui por migrations sem perda de dados.
- **Evidência por inspeção**: o banco é aberto pelo cliente libSQL, com chaves estrangeiras habilitadas, e as migrations 1 a 6 são aplicadas uma única vez cada, cada uma numa transação (`batch`): usuários e movimentações, metas, importações de faturas, sessões, categorias e metas por usuário. Os testes de integração verificam que reaplicar as migrations preserva os dados. O arquivo do banco não é versionado. Na imagem Docker, o banco fica em `/data/financeiro.sqlite`, num volume. Na hospedagem no Render, fica no Turso ([guia](docs/ci-cd/deploy.md#onde-ficam-os-dados)).
- **Comprovado por execução (testes automatizados)**: esse teste faz parte do job `backend-integration-coverage`, concluído com sucesso na execução de 17/10/2026. Ele usa banco em memória (`:memory:`) e, portanto, não verifica a gravação em arquivo.
- **Comprovado por execução (validação manual)**: em 17/10/2026, na branch `Branch-Donatto`, o grupo criou um registro fictício na tabela `usuarios` do arquivo SQLite publicado pelo deploy, executou novamente a pipeline completa com deploy, consultou o registro, que manteve o mesmo id e o mesmo nome, e depois o removeu. O procedimento está documentado em [registro do deploy anterior](docs/ci-cd/deploy.md#versão-anterior-deploy-em-pasta-do-agente). Isso comprova que o arquivo do banco é preservado entre deploys.
- **Comprovado por execução (imagem Docker)**: o `backend-deploy` #3 (commit `5060557`) recriou o contêiner com o mesmo volume e confirmou que usuário, sessão e categorias continuavam salvos, tudo gravado pela API. Na verificação local de 10/11/2026, o mesmo teste também preservou as movimentações.
- **Pendente**: comprovar as movimentações no Jenkins. Cartões ainda não têm tabela.

### RNF05 - Validação por testes e Jenkins

- **Pretendido**: antes de cada merge na `main`, o grupo executa a pipeline completa sobre a branch do pull request e confere que todos os checks terminaram com sucesso.
- **Evidência por inspeção**: o backend possui testes unitários e de integração com Vitest, e o frontend possui testes do validador, dos serviços e das telas de cadastro, categorias e importação. A pipeline completa (`Jenkinsfile`) executa os builds do frontend (com `npm test`) e do backend, os testes unitários, os testes de integração com cobertura e o deploy, que constrói, verifica e publica a imagem, repassando o mesmo SHA aos cinco jobs. Na `main`, a pipeline é iniciada pelo job `gatilho-main` (polling a cada 2 minutos). Para outras branches, ela é disparada manualmente no Jenkins, informando a branch.
- **Comprovado por execução**: a execução na `main` em 17/10/2026 ([registro](docs/jenkins/evidencias/pipeline-completa-main-2026-10-17.txt)) e a `pipeline-completa` #3 do commit `5060557`, cujo `frontend-build` já executa os testes do frontend.
- **Pendente**: não há evidência de que o resultado do Jenkins bloqueie merges automaticamente; a conferência dos checks antes do merge é responsabilidade do grupo. Não há limite mínimo de cobertura configurado.

## Refactorings

| Responsável | Code smell | Refactoring aplicado | Justificativa | PR |
| --- | --- | --- | --- | --- |
| Gustavo | O método de prévia reunia preparação dos lançamentos e cálculo da identificação da fatura. | **Extract Function:** extração de `calculateInvoiceFingerprint()` em [invoice-import-workflow.ts](backend/src/features/invoice-import/application/invoice-import-workflow.ts). | Isola a identificação usada contra duplicidade, preservando o algoritmo SHA-256, a versão `invoice-v1`, a ordenação e o uso dos lançamentos originais, inclusive negativos e descrições completas. | https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/42 |
| Gustavo | A configuração do perfil CSV fictício estava repetida em três pontos de dois arquivos de teste. | **Extract Function:** criação de [createExampleCsvProfile()](backend/tests/fixtures/invoice-import/create-example-csv-profile.ts), utilizada nos testes do serviço e do registro de perfis. | Centraliza a configuração comum e mantém identificador e versão configuráveis. Cada chamada cria uma instância própria; os cenários e as verificações dos testes permanecem iguais. | https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/42 |
| Caio | Cadastro e login traziam os detalhes de criptografia da senha (salt, `scrypt`, formato gravado, `timingSafeEqual` e hash fictício) misturados às regras de cada serviço, e o formato `scrypt:<salt>:<hash>` precisava ser mantido igual em dois arquivos. | **Extract Module / Extract Function:** criação de [senhas.ts](backend/src/services/senhas.ts), com `gerarHashDeSenha()`, `senhaConfere()` e `HASH_FICTICIO`, utilizado por [createUserService.ts](backend/src/services/createUserService.ts) e [loginService.ts](backend/src/services/loginService.ts). Testes: [senhas.test.ts](backend/tests/unit/auth/senhas.test.ts) (novo), [loginService.test.ts](backend/tests/unit/auth/loginService.test.ts) e [auth.test.ts](backend/tests/integration/auth.test.ts). | Concentra o formato e a verificação em um único módulo, sem alterar formato, salt de 16 bytes, hash de 64 bytes, parâmetros do `scrypt`, comparação com `timingSafeEqual` nem o hash fictício usado para e-mail inexistente. Validações, mensagens, respostas HTTP e esquema do banco permanecem iguais. Um hash fixo gerado pelo código anterior continua aceito no login. | A preencher após a criação do PR |
| Caio | A tela `Categorias.tsx` misturava apresentação com carregamento da lista, criação, sete estados, validação e tratamento de erros e de sessão expirada. | **Extract Function (custom hook):** criação de [useCategorias](frontend/src/hooks/useCategorias.ts), que concentra estado e regras; [Categorias.tsx](frontend/src/pages/Categorias.tsx) fica responsável pela apresentação. Testes: [Categorias.test.tsx](frontend/src/pages/Categorias.test.tsx). | Separa lógica e interface, mantendo a injeção do serviço usada pelos testes, o tratamento de sessão expirada, a limpeza do formulário, o cancelamento, as validações (nome vazio e limite de 50 caracteres), o bloqueio de envio repetido, o layout, os textos, a ordem das categorias e as chamadas à API. Os cenários novos de teste foram executados antes da extração, para registrar o comportamento original. | A preencher após a criação do PR |

Evidências dos refactorings do Caio:

- **ANTES**: `pipeline-completa` #17 concluída com sucesso na `Branch-Caio`, commit `903cbb0b`, com builds e testes aprovados (o Render não é atualizado a partir dessa branch).
- **DEPOIS**: pendente. Será registrada a execução da `pipeline-completa` sobre o commit com os dois refactorings.

## Gestão ágil

O grupo utiliza **Kanban** no Trello para organizar o trabalho: [Kanban - Controle Financeiro C14](https://trello.com/b/fc8c7V8Z/kanban-controle-financeiro-c14).

### Listas do quadro

- **User Story**: catálogo das histórias de usuário. Cada cartão descreve a história, seus critérios de aceite e os links para as tarefas que a implementam. Não é uma etapa do fluxo: as histórias permanecem nesta lista enquanto suas tarefas avançam pelas demais.
- **Backlog**: demandas registradas que aguardam priorização.
- **A Fazer**: tarefas selecionadas para execução, ainda não iniciadas.
- **Em andamento**: tarefas que estão sendo executadas.
- **Revisão de código**: alterações abertas em pull request que aguardam revisão.
- **Concluído**: trabalho revisado e validado.
- **Bloqueado**: itens impedidos de avançar. O cartão registra o motivo do bloqueio e a dependência que precisa ser resolvida.

### Regras de uso

- Os critérios de aceite de uma história são marcados somente depois que o comportamento correspondente é validado, e não apenas quando o código é escrito.
- Cada integrante deve criar ao menos uma história de usuário. A história do José ainda está pendente de cadastro no quadro.

## Jenkins

Consulte o [guia de instalação e uso do Jenkins](docs/jenkins/README.md) para preparar o ambiente com Docker, executar manualmente o build do frontend e executar a [pipeline completa](docs/jenkins/README.md#5-executar-a-pipeline-completa), que encadeia builds, testes e a publicação da imagem sobre um mesmo commit.

Guias dos jobs do backend:

- [Testes unitários](docs/jenkins/unitarios.md)
- [Testes de integração e cobertura](docs/jenkins/backend-integracao-cobertura.md)
- [Publicação da imagem no Docker Hub](docs/ci-cd/deploy.md), com o [guia rápido para baixar e executar a imagem](docs/ci-cd/deploy.md#guia-rápido-executar-a-imagem-publicada)

## US05 — Metas financeiras

Esta contribuição entrega somente o backend de cadastro e consulta de metas com
SQLite e validação. A interface será integrada pelo Donnato; progresso dinâmico
ainda não está implementado. Consulte o [contrato da API e os testes da US05](docs/us05-metas-financeiras.md).
