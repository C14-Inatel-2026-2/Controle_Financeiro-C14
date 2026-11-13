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

### Usar o site público (caminho mais simples)

Abra <https://controle-financeiro-c14.onrender.com>, crie uma conta e entre. Não é preciso instalar nada.

- O site roda no Render gratuito, com o banco no Turso. Ele continua no ar com o PC do Caio desligado.
- No plano gratuito, o serviço dorme depois de um período sem acesso, e o primeiro acesso pode levar cerca de um minuto ([limitações do plano gratuito](docs/ci-cd/deploy.md#limitações-do-plano-gratuito)).
- Use dados fictícios: as contas criadas no site ficam no banco de produção.
- O que já funciona pela interface e o que ainda falta estão em [Requisitos funcionais](#requisitos-funcionais) e nas [limitações para quem for demonstrar](docs/ci-cd/deploy.md#limitações-para-quem-for-demonstrar). A principal: metas ainda não têm tela.

### Rodar a imagem publicada no próprio computador

Basta ter Docker compatível com `linux/amd64`. Não é preciso clonar o projeto nem instalar Jenkins, Node ou npm. Siga o [guia rápido da imagem](docs/ci-cd/deploy.md#guia-rápido-executar-a-imagem-publicada), que usa a tag `latest` ou a tag do SHA de uma versão publicada.

- O Docker Hub mantém a imagem disponível mesmo com o computador do Caio desligado.
- A aplicação roda no computador que inicia o contêiner. Cada instalação tem o próprio banco, guardado no volume `controle-financeiro-dados`, separado do banco do site público.

### Como uma versão nova chega ao site

PR para a `main` → validação automática do PR no Jenkins (`pr-validacao`) → review e merge no GitHub → polling da `main` (`gatilho-main`, a cada 2 minutos) → `pipeline-completa` com `BRANCH=main` → imagem do SHA e `latest` no Docker Hub → pedido de deploy ao Render. Detalhes em [Publicar uma versão nova](docs/ci-cd/deploy.md#publicar-uma-versão-nova).

- O resultado da validação aparece no PR como o check `continuous-integration/jenkins/pr-head`. A `main` não tem proteção de branch, então esse check **não bloqueia o merge**: o grupo confere o status antes de integrar ([validação de PRs](docs/jenkins/validacao-pr.md)).
- Validar PRs e publicar versões novas exige o PC do Caio, o Docker Desktop e o Jenkins ligados e com internet. O site e o banco no Turso não dependem do PC: com ele desligado, o site continua no ar, só não recebe versões novas.
- O Jenkins registra só que o Render **aceitou** o pedido de deploy. Se a versão ficou **Live**, isso se confere no painel do Render.
- Pushes em outras branches não atualizam o site.

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

Classificação revisada em 12/11/2026 sobre a `Branch-Caio` no commit `8ed4a45`, que tem a mesma árvore de arquivos da `main` `b6a28fe` (merge do PR #51). A `main` `0bef6ac` (PR #52) só muda a configuração da suíte unitária. A coluna "O que existe hoje" separa o que está ligado à interface do que só existe na API:

- **Implementado**: funciona de ponta a ponta para o usuário (interface, API e persistência, quando aplicáveis) e é coberto por testes.
- **Parcialmente implementado**: existem regras de negócio, API, persistência ou telas, mas o fluxo completo ainda não está disponível ao usuário pela interface.
- **Planejado**: ainda não há código correspondente.
- **Cancelado**: retirado do escopo pelo grupo.

As evidências de execução estão em [Requisitos não funcionais](#requisitos-não-funcionais).

| ID | Requisito | Situação | O que existe hoje | O que falta |
| --- | --- | --- | --- | --- |
| RF01 | Cadastro de usuários: a pessoa informa nome, e-mail e senha para criar uma conta; e-mails duplicados são rejeitados. | Implementado | Serviço de cadastro com validação de nome, formato de e-mail, senha com no mínimo 8 caracteres, normalização do e-mail e rejeição de duplicidade (`backend/src/services/createUserService.ts`); `POST /users` montado em `createAppComBanco` e gravando no SQLite (`backend/src/repositories/sqliteUserRepository.ts`), com respostas 201, 400 ou 409; tela de cadastro (`frontend/src/pages/Cadastro.tsx`) que valida localmente, chama a API pelo `ServicoDeCadastro`, mostra sucesso só após a resposta e então limpa os campos, mantém os dados quando a API recusa ou a rede falha, trata e-mail duplicado e falha geral e bloqueia envio repetido. Testes: `backend/tests/integration/cadastro-sqlite.test.ts` e `frontend/src/pages/Cadastro.test.tsx`. Cadastro também verificado dentro da imagem Docker. | Unificar ou remover o módulo alternativo `backend/src/features/users/` (veja RNF01). Uma senha formada só por espaços ainda é aceita. |
| RF02 | Login e autenticação: a pessoa entra com e-mail e senha e passa a acessar somente os próprios dados. | Implementado | **API:** `POST /auth/login`, `POST /auth/logout` e `GET /auth/me` com sessão no banco e cookie `HttpOnly`; `req.usuario.id` protege categorias, movimentações, resumo, metas e a confirmação de faturas ([docs/autenticacao.md](docs/autenticacao.md)). Login, cookie e sessão após a recriação do contêiner são verificados dentro da imagem. **Interface:** `Login.tsx` entra só depois do `200` da API e mostra a mensagem do 401; o App consulta `/auth/me` ao abrir, bloqueia as telas internas sem sessão, volta ao login quando uma chamada protegida responde 401 e mostra o nome da conta e "Sair" no topo ([login pela tela](docs/autenticacao.md#login-pela-tela)). Testes: `Login.test.tsx`, `App.test.tsx` e `ServicoDeAutenticacao.test.ts`. Em 12/11/2026, conferido no navegador numa instância local com banco temporário: senha errada mantém o login, F5 mantém a sessão, Sair encerra e um 401 volta ao login com aviso. | As telas não têm endereço próprio: o botão Voltar do navegador sai do app. |
| RF03 | Registro e consulta de receitas e despesas: a pessoa cadastra movimentações com descrição, tipo, valor e data e consulta as que registrou. | Implementado | **API:** `GET` e `POST /movimentacoes` (também em `/api`), com sessão, validação dos campos e listagem só do usuário da sessão (PR #34, [contrato](docs/categorias.md#movimentações-com-categoria)). **Interface:** tela Lançamentos (`frontend/src/pages/Movimentacoes.tsx`, PR #47), no menu e no atalho da Início: descrição, tipo, valor em reais convertido para centavos, data, categoria opcional e histórico da conta. Testes: `backend/tests/integration/movimentacoes-http.test.ts` e `frontend/src/pages/Movimentacoes.test.tsx`. | Valor 0 e datas distantes (por exemplo 9999-12-31) são aceitos, e o erro de validação só indica o campo quando é a descrição. A tela recusa valores com separador de milhar (1.234,56). A tela tem um único cenário de teste automatizado. |
| RF04 | Organização de gastos por categoria: a pessoa cria categorias e associa despesas a elas. | Implementado | **API:** categorias por usuário no banco (migration 5), `GET` e `POST /categories` com a sessão e `categoriaId` opcional nas movimentações, com recusa de categoria inexistente ou de outra conta ([docs/categorias.md](docs/categorias.md)). **Interface:** tela de categorias ligada à API, escolha da categoria na tela Lançamentos e gastos por categoria no Dashboard. Testes: `backend/tests/integration/categories.test.ts` e `frontend/src/pages/Categorias.test.tsx`. | A US04 pede recusar nomes repetidos desconsiderando maiúsculas, mas hoje "Lazer" e "lazer" coexistem na mesma conta ([docs/categorias.md](docs/categorias.md)). A categoria nova aparece no fim da lista e muda de posição depois de recarregar a página. |
| RF05 | Cadastro de cartões de crédito: a pessoa registra os cartões que utiliza. | Cancelado | Não há código de cartões. No Trello, o cartão "Implementar cadastro de cartões de crédito" foi movido para **Cancelado** em 11/11/2026. O cartão não registra o motivo. | Registrar o motivo do cancelamento. |
| RF06 | Importação de faturas: a pessoa envia a fatura do cartão e revisa os lançamentos extraídos antes de salvá-los. | Implementado | **API e interface:** tela Importar fatura com prévia de PDF do Itaú (layouts v1 e v2, inclusive PDF protegido por senha) e de CSV no template `data;descricao;valor`, pela rota pública `/invoice-imports/preview`. A confirmação exige sessão, grava os lançamentos como despesas do usuário num único lote e recusa a mesma fatura duas vezes ([guia da importação](backend/src/features/invoice-import/README.md)). As despesas importadas ficam na mesma tabela das movimentações e aparecem em Lançamentos e no Dashboard. | A tela não usa o menu das outras telas internas. Valores negativos (estornos) são descartados, e a prévia informa quantos foram. Não há registro de teste com faturas reais além do PDF de exemplo do repositório. Sem vínculo com cartões (RF05 cancelado). |
| RF07 | Consulta de saldo e resumo financeiro: a pessoa vê o saldo (receitas menos despesas) e um resumo dos gastos. | Implementado | **API:** `GET /resumo` (também em `/api`), com sessão: saldo calculado por `calcularSaldo`, receitas e despesas do mês, gastos do mês por categoria e os cinco lançamentos mais recentes. `?mes=AAAA-MM` escolhe o mês; sem ele, vale o mês atual no fuso de São Paulo. **Interface:** Dashboard com os valores em R$ e filtro de mês (PRs #43 e #47). Testes: `backend/tests/unit/resumo.test.ts`, `backend/tests/integration/resumo.test.ts` e `frontend/src/pages/Dashboard.test.tsx`. | O "Saldo atual" soma todos os lançamentos, inclusive os de datas futuras, e não muda com o mês escolhido. O filtro usa `input type="month"` e foi conferido só no Chrome. |
| RF08 | Metas financeiras: a pessoa define metas com nome e valor-alvo e acompanha o progresso. | Parcialmente implementado | **API:** `POST` e `GET /goals` (também em `/api`), com sessão e metas por usuário (migration 6, PR #44): nome obrigatório, valor-alvo positivo em centavos e nome único só dentro da conta ([US05](docs/us05-metas-financeiras.md)). **Interface:** não há tela de metas; o atalho Metas da Início fica desabilitado. | Tela de metas e regra de progresso: `progressAmountInCents` é sempre 0. As metas criadas antes da migration 6 ficaram sem dono e não aparecem para nenhuma conta. |

## Requisitos não funcionais

Cada requisito separa três situações:

- **Pretendido**: a condição que o sistema deve atender.
- **Evidência por inspeção**: o que o código e os testes implementam, conforme leitura dos arquivos.
- **Comprovado por execução**: cada registro vale só para o commit indicado.
  - **Jenkins, 17/10/2026 (histórico):** [pipeline completa na `main`](docs/jenkins/evidencias/pipeline-completa-main-2026-10-17.txt), commit `dbcc705`, cinco jobs em `SUCCESS`, ainda com o deploy antigo, sem imagem Docker.
  - **Jenkins do PC do Caio, commit `5060557` (histórico: `Branch-Caio`, antes das movimentações e do login pela tela):** `pipeline-completa` #3 e `backend-deploy` #3 em `SUCCESS`, com a imagem publicada e conferida por digest ([registro](docs/ci-cd/deploy.md#evidências-registradas)).
  - **Verificação local, 10/11/2026 (histórico), merge da `main` na `Branch-Caio` antes do commit:** backend com 164 testes unitários, 81 de integração e 245 na cobertura (89,29% das instruções); frontend com 40 testes; lint e builds sem erro. A imagem construída localmente passou na verificação do deploy, inclusive movimentações e persistência no volume.
  - **Jenkins do PC do Caio, 12/11/2026 (informado pelo Caio, com prints guardados por ele):** depois do merge do PR #50 (remoção das setas da Início), o `gatilho-main` #3 iniciou sozinho a `pipeline-completa` #15, que terminou em `SUCCESS`. O Render ficou **Live**, e a mudança apareceu no site público. Também em 12/11, na `Branch-Caio` e sem atualizar o Render, a `pipeline-completa` #17 terminou em `SUCCESS` no commit `903cbb0b`, e a #18 em `SUCCESS` no commit `8ed4a458` ([evidências anexadas no PR #51](https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/51)). O SHA exato testado pela #15, os digests e os ids de deploy não estão registrados neste repositório. O merge do PR #50 é anterior à tela Lançamentos e ao filtro de mês (PR #47), por isso a #15 não cobre essas telas. A #17 (`903cbb0b`) já as inclui.
  - **Conferido diretamente em 12/11/2026, em fontes públicas:** no GitHub, o status `continuous-integration/jenkins/pr-head` do commit `8ed4a45` (PR #51) é `success`. No Docker Hub, `latest` e a tag `b6a28fe94e909881ccfe72ba6df317db91f11ba8` têm o mesmo digest, `sha256:6c0d22c9b9693d18af6bcaf27d8bdc55f2828b02271edbfea966489d4c983b8e`. O site público serve o mesmo arquivo de frontend (`assets/index-DcBb0RLB.js`) gerado por um build local da `b6a28fe`. Uma tag publicada não informa, sozinha, o número nem o resultado da pipeline.
  - **Verificação local, 12/11/2026, commit `8ed4a45` (mesma árvore da `b6a28fe`):** backend com 195 testes unitários, 99 de integração e 294 na cobertura (93,56% das linhas); frontend com 68 testes; lint, builds e `npm audit --omit=dev` sem problemas. Cadastro, login, sessão, categorias, lançamentos, Dashboard, importação de CSV e isolamento entre duas contas foram conferidos numa instância local com banco temporário, pelo navegador (Chrome, desktop e 375 px) e por HTTP.
  - **Pendente:** registrar a `pipeline-completa` da `main` atual, `0bef6ac` (PR #52), que ainda não tinha imagem no Docker Hub na conferência de 12/11/2026.

Não há metas de desempenho, de cobertura mínima ou de disponibilidade definidas no projeto.

### RNF01 - Proteção de senhas

- **Pretendido**: nenhuma senha é armazenada ou devolvida em texto puro; o banco guarda apenas um hash com salt.
- **Evidência por inspeção**: o serviço de cadastro (`backend/src/services/createUserService.ts`) chama `gerarHashDeSenha()` de `backend/src/services/senhas.ts`, que gera um salt aleatório de 16 bytes e deriva o hash com `scrypt` (formato `scrypt:<salt>:<hash>`). A tabela `usuarios` possui apenas a coluna `senha_hash`, e a resposta do cadastro não inclui a senha. O teste unitário `backend/tests/unit/createUserService.test.ts` verifica que o repositório recebe somente o hash.
- **Comprovado por execução**: esse teste faz parte do job `backend-unit-igor`, concluído com sucesso na execução de 17/10/2026.
- **Evidência por inspeção (login)**: o login (`backend/src/services/loginService.ts`) usa `senhaConfere()` do mesmo módulo, que confere a senha no formato `scrypt:<salt>:<hash>` com `timingSafeEqual` e usa um hash fictício quando o e-mail não existe; `senha_hash` é lido só por uma consulta interna e não aparece nas respostas. Os testes `backend/tests/unit/auth/senhas.test.ts`, `backend/tests/unit/auth/loginService.test.ts` e `backend/tests/integration/auth.test.ts` cobrem esse fluxo, inclusive um hash gravado antes do refactoring do PR #51.
- **Comprovado por execução (login)**: os testes de login existem desde o PR #36 e fazem parte dos jobs `backend-unit-igor` e `backend-integration-coverage`. A última execução com `SUCCESS` informada é a `pipeline-completa` #15 (informado pelo Caio). `senhas.test.ts` passou na validação do PR #51 (status `success` no commit `8ed4a45`, conferido no GitHub).
- **Pendente**: o módulo alternativo `backend/src/features/users/` ainda trata a senha sem hash. Ele não é usado pela aplicação e precisa ser unificado ao serviço acima ou removido.

### RNF02 - Isolamento dos dados por usuário

- **Pretendido**: cada usuário acessa somente os próprios dados, e o identificador do usuário vem da autenticação, nunca do corpo da requisição.
- **Evidência por inspeção**: o repositório de movimentações filtra todas as consultas por `usuario_id`, e a chave estrangeira impede movimentações de usuário inexistente. O teste `backend/tests/integration/database.test.ts` verifica que as movimentações de um usuário não aparecem para outro.
- **Comprovado por execução**: esse teste faz parte do job `backend-integration-coverage`, concluído com sucesso na execução de 17/10/2026.
- **Evidência por inspeção (rotas com sessão)**: `/auth/me`, `/categories`, `/movimentacoes`, `/resumo`, `/goals` e a confirmação de faturas tiram o usuário de `req.usuario.id` e ignoram `usuarioId` no corpo. Os testes de integração verificam o isolamento entre duas contas, inclusive a recusa de categoria de outra conta numa movimentação.
- **Comprovado por execução**: categorias e sessão no Jenkins do commit `5060557` (histórico). A verificação da imagem no `backend-deploy` também cria movimentações com e sem categoria, e a `pipeline-completa` #15 terminou com `SUCCESS` (informado pelo Caio). Em 12/11/2026, conferido diretamente por HTTP numa instância local com banco temporário: duas contas não veem categorias, lançamentos, resumo, metas nem importações uma da outra, e um `usuarioId` no corpo é ignorado.
- **Pendente**: as metas criadas antes da migration 6 continuam no banco sem dono. Elas não aparecem para nenhuma conta.

### RNF03 - Precisão monetária

- **Pretendido**: todo valor monetário é armazenado e calculado como inteiro seguro em centavos (`Number.isSafeInteger`), sem ponto flutuante. A conversão de reais para centavos ocorre na entrada dos dados, e a formatação em reais ocorre apenas na exibição, sem retornar aos cálculos.
- **Evidência por inspeção**: movimentações, saldo e metas validam valores com `Number.isSafeInteger`; o banco rejeita valores que não sejam inteiros (`CHECK (typeof(valor_em_centavos) = 'integer')`). A importação de faturas converte os valores lidos para centavos. Os testes unitários e o teste de integração do banco verificam a rejeição de valores negativos e de centavos fracionados.
- **Comprovado por execução**: esses testes fazem parte dos jobs `backend-unit-igor` e `backend-integration-coverage`, concluídos com sucesso na execução de 17/10/2026.
- **Evidência por inspeção (interface)**: o Dashboard, a tela Lançamentos e a importação formatam os centavos em reais só na exibição (`Intl.NumberFormat` e `toLocaleString` com `pt-BR` e `BRL`). A tela Lançamentos converte o texto em reais para centavos sem ponto flutuante.
- **Pendente**: o valor 0 é aceito em movimentações. O grupo precisa decidir se ele é válido.

### RNF04 - Persistência

- **Pretendido**: os dados financeiros permanecem salvos entre execuções e o esquema do banco evolui por migrations sem perda de dados.
- **Evidência por inspeção**: o banco é aberto pelo cliente libSQL, com chaves estrangeiras habilitadas, e as migrations 1 a 6 são aplicadas uma única vez cada, cada uma numa transação (`batch`): usuários e movimentações, metas, importações de faturas, sessões, categorias e metas por usuário. Os testes de integração verificam que reaplicar as migrations preserva os dados. O arquivo do banco não é versionado. Na imagem Docker, o banco fica em `/data/financeiro.sqlite`, num volume. Na hospedagem no Render, fica no Turso ([guia](docs/ci-cd/deploy.md#onde-ficam-os-dados)).
- **Comprovado por execução (testes automatizados)**: esse teste faz parte do job `backend-integration-coverage`, concluído com sucesso na execução de 17/10/2026. Ele usa banco em memória (`:memory:`) e, portanto, não verifica a gravação em arquivo.
- **Comprovado por execução (validação manual)**: em 17/10/2026, na branch `Branch-Donatto`, o grupo criou um registro fictício na tabela `usuarios` do arquivo SQLite publicado pelo deploy, executou novamente a pipeline completa com deploy, consultou o registro, que manteve o mesmo id e o mesmo nome, e depois o removeu. O procedimento está documentado em [registro do deploy anterior](docs/ci-cd/deploy.md#versão-anterior-deploy-em-pasta-do-agente). Isso comprova que o arquivo do banco é preservado entre deploys.
- **Comprovado por execução (imagem Docker, histórico)**: o `backend-deploy` #3 (commit `5060557`) recriou o contêiner com o mesmo volume e confirmou que usuário, sessão e categorias continuavam salvos, tudo gravado pela API. Na verificação local de 10/11/2026, o mesmo teste também preservou as movimentações.
- **Comprovado por execução (site público)**: segundo o Caio, as categorias continuaram salvas no Turso depois de uma troca de imagem no Render ([registro](docs/ci-cd/deploy.md#hospedagem-pública-no-render-com-turso)).
- **Pendente**: registrar uma conferência de persistência no site público com lançamentos e importação, com data e SHA ([roteiro](docs/ci-cd/deploy.md#4-testar-a-url-pública-e-a-persistência)). Cartões foram cancelados (RF05) e não têm tabela.

### RNF05 - Validação por testes e Jenkins

- **Pretendido**: cada pull request para a `main` é validado automaticamente pelo Jenkins, e o grupo só integra depois de conferir que o check terminou com sucesso. Depois do merge, a `main` é testada e publicada pela pipeline completa.
- **Evidência por inspeção**: o backend possui testes unitários e de integração com Vitest, e o frontend possui testes do validador, dos serviços, do App e das telas de login, cadastro, categorias, lançamentos, Dashboard e importação. O job `pr-validacao` ([Jenkinsfile.pr](Jenkinsfile.pr)) mescla o PR com a ponta da `main` no agente e roda testes e build do frontend, build do backend e os testes unitários e de integração, publicando o status `continuous-integration/jenkins/pr-head` no PR ([guia](docs/jenkins/validacao-pr.md)). A pipeline completa (`Jenkinsfile`) executa os builds do frontend (com `npm test`) e do backend, os testes unitários, os testes de integração com cobertura e o deploy, que constrói, verifica e publica a imagem, repassando o mesmo SHA aos cinco jobs. Com `BRANCH=main`, ela termina pedindo o deploy ao Render. Na `main`, a pipeline é iniciada pelo job `gatilho-main` (polling a cada 2 minutos). Para outras branches, ela é disparada manualmente no Jenkins, informando a branch.
- **Comprovado por execução**: a execução na `main` em 17/10/2026 ([registro](docs/jenkins/evidencias/pipeline-completa-main-2026-10-17.txt), histórico) e a `pipeline-completa` #3 do commit `5060557` (histórico). Em 12/11/2026, segundo o Caio, o `gatilho-main` #3 iniciou a `pipeline-completa` #15 após o merge do PR #50, e ela terminou em `SUCCESS` com o Render **Live**. Conferido diretamente no GitHub: os PRs #37, #40, #42 a #48 e #51 têm o status `pr-head` com `success` no último commit.
- **Pendente**: a `main` não tem proteção de branch (conferido pela API do GitHub em 12/11/2026), então o check do Jenkins não bloqueia o merge. Os PRs #36, #41, #49 e #50 foram integrados sem status do Jenkins no último commit. O lint do frontend não roda no Jenkins, e não há limite mínimo de cobertura configurado.

## Refactorings

| Responsável | Code smell | Refactoring aplicado | Justificativa | PR |
| --- | --- | --- | --- | --- |
| Gustavo | O método de prévia reunia preparação dos lançamentos e cálculo da identificação da fatura. | **Extract Function:** extração de `calculateInvoiceFingerprint()` em [invoice-import-workflow.ts](backend/src/features/invoice-import/application/invoice-import-workflow.ts). | Isola a identificação usada contra duplicidade, preservando o algoritmo SHA-256, a versão `invoice-v1`, a ordenação e o uso dos lançamentos originais, inclusive negativos e descrições completas. | https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/42 |
| Gustavo | A configuração do perfil CSV fictício estava repetida em três pontos de dois arquivos de teste. | **Extract Function:** criação de [createExampleCsvProfile()](backend/tests/fixtures/invoice-import/create-example-csv-profile.ts), utilizada nos testes do serviço e do registro de perfis. | Centraliza a configuração comum e mantém identificador e versão configuráveis. Cada chamada cria uma instância própria; os cenários e as verificações dos testes permanecem iguais. | https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/42 |
| Caio | Cadastro e login traziam os detalhes de criptografia da senha (salt, `scrypt`, formato gravado, `timingSafeEqual` e hash fictício) misturados às regras de cada serviço, e o formato `scrypt:<salt>:<hash>` precisava ser mantido igual em dois arquivos. | **Extract Module / Extract Function:** criação de [senhas.ts](backend/src/services/senhas.ts), com `gerarHashDeSenha()`, `senhaConfere()` e `HASH_FICTICIO`, utilizado por [createUserService.ts](backend/src/services/createUserService.ts) e [loginService.ts](backend/src/services/loginService.ts). Testes: [senhas.test.ts](backend/tests/unit/auth/senhas.test.ts) (novo), [loginService.test.ts](backend/tests/unit/auth/loginService.test.ts) e [auth.test.ts](backend/tests/integration/auth.test.ts). | Concentra o formato e a verificação em um único módulo, sem alterar formato, salt de 16 bytes, hash de 64 bytes, parâmetros do `scrypt`, comparação com `timingSafeEqual` nem o hash fictício usado para e-mail inexistente. Validações, mensagens, respostas HTTP e esquema do banco permanecem iguais. Um hash fixo gerado pelo código anterior continua aceito no login. | https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/51 |
| Caio | A tela `Categorias.tsx` misturava apresentação com carregamento da lista, criação, sete estados, validação e tratamento de erros e de sessão expirada. | **Extract Function (custom hook):** criação de [useCategorias](frontend/src/hooks/useCategorias.ts), que concentra estado e regras; [Categorias.tsx](frontend/src/pages/Categorias.tsx) fica responsável pela apresentação. Testes: [Categorias.test.tsx](frontend/src/pages/Categorias.test.tsx). | Separa lógica e interface, mantendo a injeção do serviço usada pelos testes, o tratamento de sessão expirada, a limpeza do formulário, o cancelamento, as validações (nome vazio e limite de 50 caracteres), o bloqueio de envio repetido, o layout, os textos, a ordem das categorias e as chamadas à API. Os cenários novos de teste foram executados antes da extração, para registrar o comportamento original. | https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/51 |

Evidências dos refactorings do Caio:

Os prints das duas execuções estão nas [evidências anexadas no PR #51](https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/51).

- **ANTES**: `pipeline-completa` #17 em `SUCCESS` na `Branch-Caio`, commit `903cbb0b`, com builds e testes aprovados. O Render não é atualizado a partir dessa branch.
- **Implementação**: commit `8ed4a45` na `Branch-Caio`, integrado à `main` pelo [PR #51](https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/51) (merge `b6a28fe`).
- **DEPOIS**: `pipeline-completa` #18 em `SUCCESS` na `Branch-Caio`, commit `8ed4a458`, com os dois refactorings.
- **Validação do PR**: a validação automática do PR #51 (`pr-validacao`, PR-51 #1) terminou com o status `continuous-integration/jenkins/pr-head` = `success` no commit `8ed4a45`, conforme o GitHub. Essa validação roda testes e builds, sem cobertura e sem publicar imagem. Localmente, no mesmo código, o backend teve 195 testes unitários, 99 de integração e 294 na cobertura, e o frontend 68 testes, com lint e builds sem erro.

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
- Cada integrante deve criar ao menos uma história de usuário. Em 12/11/2026, o quadro tinha as histórias US01 a US05, uma de cada integrante.

## Jenkins

Consulte o [guia de instalação e uso do Jenkins](docs/jenkins/README.md) para preparar o ambiente com Docker, executar manualmente o build do frontend e executar a [pipeline completa](docs/jenkins/README.md#5-executar-a-pipeline-completa), que encadeia builds, testes e a publicação da imagem sobre um mesmo commit.

Guias dos jobs do backend:

- [Testes unitários](docs/jenkins/unitarios.md)
- [Testes de integração e cobertura](docs/jenkins/backend-integracao-cobertura.md)
- [Validação automática de pull requests](docs/jenkins/validacao-pr.md)
- [Publicação da imagem no Docker Hub](docs/ci-cd/deploy.md), com o [guia rápido para baixar e executar a imagem](docs/ci-cd/deploy.md#guia-rápido-executar-a-imagem-publicada)

## US05 — Metas financeiras

O backend de metas está implementado: cadastro e consulta com sessão, com as metas de cada
usuário separadas (PR #44). A tela de metas ainda não existe no frontend, e o progresso
fica sempre em zero. Este README atribuía a integração da interface ao Donatto, e o guia
da US05 a atribui ao Caio: o grupo precisa confirmar o responsável. Consulte o [contrato da API e os testes da US05](docs/us05-metas-financeiras.md).

## Uso de IA

Esta seção apresenta as ferramentas e os modelos utilizados pelo grupo, suas finalidades e exemplos reais de prompts, indicando quais sugestões foram aceitas, ajustadas ou descartadas.

### Gustavo — Configuração do Jenkins com controle de versões

**Ferramenta/modelo:** Codex GPT-6 Astra.

**Finalidade:** auxiliar na configuração do Jenkins por código, explicando os arquivos e comandos para permitir a implementação pelo integrante e a reprodução do ambiente pelo grupo.

**Pedido inicial — mensagem completa:**

> beleza, vamos seguir assim, vai me passando o código e me explicando e eu vou revisando e implementando lá

Durante essa configuração, a IA sugeriu o seguinte trecho para instalar os plugins:

```dockerfile
RUN jenkins-plugin-cli \
    --plugin-file /usr/share/jenkins/ref/plugins.txt \
    --latest=true
```

**Revisão do integrante — mensagem completa:**

```csharp
RUN jenkins-plugin-cli \
    --plugin-file /usr/share/jenkins/ref/plugins.txt \
    --latest=true
```

> Pq usar o --lasters=true? não seria melhor manter uma versão estavel?

**O que foi aceito, ajustado ou descartado:** a instalação dos plugins por código foi aceita, mas a opção de selecionar versões mais recentes automaticamente foi revista após o questionamento do integrante. A configuração adotada passou a utilizar versões explícitas dos plugins e de suas dependências em `plugins.txt`, combinadas com `--latest=false` no Dockerfile.

**Justificativa do ajuste:** controlar as versões utilizadas na construção da imagem melhora a reprodutibilidade do ambiente. As atualizações passam a ser decisões explícitas, sujeitas à revisão de compatibilidade e à validação do grupo.

