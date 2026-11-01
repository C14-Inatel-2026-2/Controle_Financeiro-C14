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

- **Backend** (`backend/`): API em Node.js com Express e TypeScript, persistência em SQLite (`node:sqlite`) e testes com Vitest.
- **Frontend** (`frontend/`): aplicação React com Vite e TypeScript.
- **Integração contínua** (`infra/jenkins/`, `Jenkinsfile`): Jenkins em Docker executando builds, testes e deploy local.

A pasta `ui/` contém telas demonstrativas (protótipos visuais). Elas representam a interface pretendida e não correspondem a funcionalidades implementadas.

## Requisitos funcionais

Classificação adotada, com base no código presente na `main`:

- **Implementado**: funciona de ponta a ponta para o usuário (interface, API e persistência, quando aplicáveis) e é coberto por testes.
- **Parcialmente implementado**: existem regras de negócio, persistência ou telas, mas o fluxo completo ainda não está disponível ao usuário.
- **Planejado**: ainda não há código correspondente na `main`.

Código de pull requests abertos não é considerado.

| ID | Requisito | Situação | O que existe hoje | O que falta |
| --- | --- | --- | --- | --- |
| RF01 | Cadastro de usuários: a pessoa informa nome, e-mail e senha para criar uma conta; e-mails duplicados são rejeitados. | Parcialmente implementado | Serviço de cadastro com validação de nome, formato de e-mail, senha com no mínimo 8 caracteres, normalização do e-mail e rejeição de duplicidade (`backend/src/services/createUserService.ts`); controller que responde 201, 400 ou 409 (`backend/src/controllers/createUserController.ts`); tabela `usuarios` com e-mail único; tela de cadastro com validação local (`frontend/src/pages/Cadastro.tsx`) e cliente HTTP (`frontend/src/services/ServicoDeCadastro.ts`). | Montar a rota de usuários na aplicação Express (`createUserRouter` ainda não é registrado em `app.ts`), implementar o `UserRepository` sobre SQLite e fazer a tela chamar a API. |
| RF02 | Login e autenticação: a pessoa entra com e-mail e senha e passa a acessar somente os próprios dados. | Planejado | Apenas o link "Entrar" na tela de cadastro, sem destino, e a tela demonstrativa `ui/Login.png`. | Verificação de senha, emissão e validação de sessão ou token e proteção das rotas. |
| RF03 | Registro e consulta de receitas e despesas: a pessoa cadastra movimentações com descrição, tipo, valor e data e consulta as que registrou. | Parcialmente implementado | Tabela `movimentacoes` e repositório com inserção e listagem por usuário (`backend/src/repositories/movimentacoes.ts`). | Rotas HTTP, ligação com o usuário autenticado e telas de registro e consulta. |
| RF04 | Organização de gastos por categoria: a pessoa cria categorias e associa despesas a elas. | Parcialmente implementado | Regra e serviço de criação de categoria com nome obrigatório e sem duplicidade (`backend/src/features/categories/`). | Persistência, associação da categoria ao usuário e às movimentações, rotas e telas (`ui/Categorias.png` é apenas demonstrativa). |
| RF05 | Cadastro de cartões de crédito: a pessoa registra os cartões que utiliza. | Planejado | Não há código de cartões na `main`. | Modelo, persistência, rotas e telas. |
| RF06 | Importação de faturas: a pessoa envia a fatura do cartão e revisa os lançamentos extraídos antes de salvá-los. | Parcialmente implementado | Pré-visualização de faturas em PDF do Itaú (layout v1) e de CSV manual no template `data;descricao;valor`, com valores convertidos para centavos (`backend/src/features/invoice-import/`). | Upload pela API, tela de importação, gravação dos lançamentos e associação com o cartão (RF05). |
| RF07 | Consulta de saldo e resumo financeiro: a pessoa vê o saldo (receitas menos despesas) e um resumo dos gastos. | Parcialmente implementado | Cálculo do saldo em centavos a partir das movimentações (`backend/src/services/calcularSaldo.ts`). | Rota e tela de saldo, resumo por categoria e por período (`ui/Dashboard.png` é apenas demonstrativa). |
| RF08 | Metas financeiras: a pessoa define metas com nome e valor-alvo e acompanha o progresso. | Parcialmente implementado | Regra e serviço de criação de meta com nome obrigatório, valor-alvo positivo em centavos e sem duplicidade (`backend/src/features/goals/`). | Persistência, associação ao usuário, acompanhamento do progresso, rotas e telas. |

## Requisitos não funcionais

Cada requisito separa três situações:

- **Pretendido**: a condição que o sistema deve atender.
- **Evidência por inspeção**: o que o código e os testes existentes na `main` implementam, conforme leitura dos arquivos. Esta atualização da documentação não executou os testes.
- **Comprovado por execução**: resultado registrado de uma execução real. Hoje o único registro é a [execução da pipeline completa na `main` em 17/10/2026](docs/jenkins/evidencias/pipeline-completa-main-2026-10-17.txt), sobre o commit `dbcc705`, em que os cinco jobs terminaram com `SUCCESS`. O código de `backend/` e `frontend/` não mudou desde esse commit; as alterações posteriores são apenas de documentação.

Não há metas de desempenho, de cobertura mínima ou de disponibilidade definidas no projeto.

### RNF01 - Proteção de senhas

- **Pretendido**: nenhuma senha é armazenada ou devolvida em texto puro; o banco guarda apenas um hash com salt.
- **Evidência por inspeção**: o serviço de cadastro (`backend/src/services/createUserService.ts`) gera um salt aleatório e deriva o hash com `scrypt` (formato `scrypt:<salt>:<hash>`). A tabela `usuarios` possui apenas a coluna `senha_hash`, e a resposta do cadastro não inclui a senha. O teste unitário `backend/tests/unit/createUserService.test.ts` verifica que o repositório recebe somente o hash.
- **Comprovado por execução**: esse teste faz parte do job `backend-unit-igor`, concluído com sucesso na execução de 17/10/2026.
- **Pendente**: o módulo alternativo `backend/src/features/users/` ainda trata a senha sem hash e precisa ser unificado ao serviço acima antes de ser usado. A verificação da senha no login depende do RF02.

### RNF02 - Isolamento dos dados por usuário

- **Pretendido**: cada usuário acessa somente os próprios dados, e o identificador do usuário vem da autenticação, nunca do corpo da requisição.
- **Evidência por inspeção**: o repositório de movimentações filtra todas as consultas por `usuario_id`, e a chave estrangeira impede movimentações de usuário inexistente. O teste `backend/tests/integration/database.test.ts` verifica que as movimentações de um usuário não aparecem para outro.
- **Comprovado por execução**: esse teste faz parte do job `backend-integration-coverage`, concluído com sucesso na execução de 17/10/2026.
- **Pendente**: sem autenticação (RF02), o isolamento ainda não é garantido nas requisições HTTP. Categorias e metas ainda não são associadas a usuários.

### RNF03 - Precisão monetária

- **Pretendido**: todo valor monetário é armazenado e calculado como inteiro seguro em centavos (`Number.isSafeInteger`), sem ponto flutuante. A conversão de reais para centavos ocorre na entrada dos dados, e a formatação em reais ocorre apenas na exibição, sem retornar aos cálculos.
- **Evidência por inspeção**: movimentações, saldo e metas validam valores com `Number.isSafeInteger`; o banco rejeita valores que não sejam inteiros (`CHECK (typeof(valor_em_centavos) = 'integer')`). A importação de faturas converte os valores lidos para centavos. Os testes unitários e o teste de integração do banco verificam a rejeição de valores negativos e de centavos fracionados.
- **Comprovado por execução**: esses testes fazem parte dos jobs `backend-unit-igor` e `backend-integration-coverage`, concluídos com sucesso na execução de 17/10/2026.
- **Pendente**: ainda não há formatação de valores em reais na interface.

### RNF04 - Persistência

- **Pretendido**: os dados financeiros permanecem salvos entre execuções e o esquema do banco evolui por migrations sem perda de dados.
- **Evidência por inspeção**: o SQLite é aberto com chaves estrangeiras habilitadas e a migration 1 é aplicada uma única vez. O teste de integração verifica que reaplicar a migration preserva os dados e que e-mails duplicados são recusados. O arquivo do banco não é versionado.
- **Comprovado por execução (testes automatizados)**: esse teste faz parte do job `backend-integration-coverage`, concluído com sucesso na execução de 17/10/2026. Ele usa banco em memória (`:memory:`) e, portanto, não verifica a gravação em arquivo.
- **Comprovado por execução (validação manual)**: em 17/10/2026, na branch `Branch-Donatto`, o grupo criou um registro fictício na tabela `usuarios` do arquivo SQLite publicado pelo deploy, executou novamente a pipeline completa com deploy, consultou o registro, que manteve o mesmo id e o mesmo nome, e depois o removeu. O procedimento está documentado em [Deploy local - Validação da persistência](docs/ci-cd/deploy.md#validação-da-persistência). Isso comprova que o arquivo do banco é preservado entre deploys.
- **Não comprovado**: persistência pela API (o registro foi escrito diretamente no arquivo, pois as rotas publicadas ainda não usam o banco), preservação após reinício do contêiner e funcionamento em uma instalação do zero.
- **Pendente**: somente usuários e movimentações têm tabela; categorias, metas, cartões e faturas importadas ainda não são persistidos.

### RNF05 - Validação por testes e Jenkins

- **Pretendido**: antes de cada merge na `main`, o grupo executa a pipeline completa sobre a branch do pull request e confere que todos os checks terminaram com sucesso.
- **Evidência por inspeção**: o backend possui testes unitários e de integração com Vitest, e o frontend possui testes do validador e do serviço de cadastro. A pipeline completa (`Jenkinsfile`) executa os builds do frontend e do backend, os testes unitários, os testes de integração com cobertura e o deploy local, repassando o mesmo SHA aos cinco jobs. Os jobs não têm gatilho automático configurado: a pipeline é disparada manualmente no Jenkins, informando a branch.
- **Comprovado por execução**: a execução manual na `main` em 17/10/2026 terminou com sucesso, conforme o [registro da pipeline](docs/jenkins/evidencias/pipeline-completa-main-2026-10-17.txt).
- **Pendente**: não há evidência de que o resultado do Jenkins bloqueie merges automaticamente; a conferência dos checks antes do merge é responsabilidade do grupo. Os testes do frontend ainda não são executados pelo Jenkins, e não há limite mínimo de cobertura configurado.

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

Consulte o [guia de instalação e uso do Jenkins](docs/jenkins/README.md) para preparar o ambiente com Docker, executar manualmente o build do frontend e executar a [pipeline completa](docs/jenkins/README.md#5-executar-a-pipeline-completa), que encadeia builds, testes e deploy sobre um mesmo commit.

Guias dos jobs do backend:

- [Testes unitários](docs/jenkins/unitarios.md)
- [Testes de integração e cobertura](docs/jenkins/backend-integracao-cobertura.md)
- [Deploy local](docs/ci-cd/deploy.md)

## US05 — Metas financeiras

Esta contribuição entrega somente o backend de cadastro e consulta de metas com
SQLite e validação. A interface será integrada pelo Donnato; progresso dinâmico
ainda não está implementado. Consulte o [contrato da API e os testes da US05](docs/us05-metas-financeiras.md).
