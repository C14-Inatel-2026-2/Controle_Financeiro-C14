# Job de integração e cobertura do backend

Este guia explica como executar o job `backend-integration-coverage`, que roda os testes de integração do backend e a suíte completa com cobertura. A instalação do Jenkins, a configuração do agente e o uso diário do ambiente estão no [guia de instalação e uso do Jenkins](README.md) e não são repetidos aqui.

## 1. Visão geral

| Item | Valor |
| --- | --- |
| Job | `backend-integration-coverage`, criado por [infra/jenkins/jobs.groovy](../../infra/jenkins/jobs.groovy) |
| Pipeline | [backend/Jenkinsfile.integration](../../backend/Jenkinsfile.integration) |
| Parâmetro | `BRANCH`, com valor padrão `Branch-Caio` |
| Repositório usado pelo job | `https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git` |
| Agente | Label `node24` (`agent-node-v2`, Node.js `24.21.0`, conforme [infra/jenkins/agent/Dockerfile](../../infra/jenkins/agent/Dockerfile)) |
| Gatilho | Somente manual; não há execução automática por push ou PR |
| Tempo máximo | 15 minutos |
| Histórico | As 10 execuções mais recentes, com seus relatórios e artefatos |

Os scripts usados vêm de [backend/package.json](../../backend/package.json):

| Script | Comando | Uso |
| --- | --- | --- |
| `test:integration` | `vitest run tests/integration --reporter=default --reporter=junit --outputFile=reports/integration.xml` | Roda somente `backend/tests/integration` e grava o JUnit XML. |
| `test:coverage` | `vitest run --coverage` | Roda a suíte completa (unitários e integração) com cobertura V8. |
| `build` | `tsc` | Compila `src` para `dist`. Não é executado por este job. |

A cobertura segue [backend/vitest.config.mts](../../backend/vitest.config.mts): mede `src/**/*.ts`, exclui `src/server.ts` e gera os formatos `text` (no console), `html` e `lcov` em `backend/coverage`.

## 2. Pré-requisitos

### No Jenkins

- Ambiente instalado conforme as seções 3 e 5 do [guia de instalação](README.md), com `agent-node-v2` conectado.
- Imagem do controlador reconstruída depois de atualizar `infra/jenkins`. Os plugins `junit` e `htmlpublisher`, usados por este job, estão em [infra/jenkins/plugins.txt](../../infra/jenkins/plugins.txt); uma instância construída antes dessa inclusão não os terá. Use o comando de [Aplicar atualizações do ambiente](README.md#aplicar-atualizações-do-ambiente).
- Branch publicada no repositório `C14-Inatel-2026-2/Controle_Financeiro-C14`, contendo `backend/Jenkinsfile.integration` e os scripts `test:integration` e `test:coverage`.

### Na máquina local (opcional)

Para reproduzir o job fora do Jenkins, use a mesma versão principal de Node.js do agente: **Node.js 24**, de preferência `24.21.0`. Os testes de banco usam o módulo `node:sqlite`, que não existe em versões antigas do Node; usar outra versão pode gerar resultados diferentes dos do Jenkins.

**Terminal PowerShell — conferir as versões:**

```powershell
node --version
npm --version
```

O resultado esperado para o Node é `v24.x`, idealmente `v24.21.0`.

## 3. Executar no Jenkins

1. Faça commit e push do que deseja verificar. O job busca a branch no GitHub; arquivos locais não enviados não entram na execução.
2. Abra [o Jenkins](http://localhost:8081/) e entre com seu usuário local.
3. Abra **backend-integration-coverage** e clique em **Construir com parâmetros / Build with Parameters**.
4. Informe o nome exato da branch em **BRANCH**, por exemplo `Branch-Caio` ou `main`, sem `origin/` e sem espaços.
5. Clique em **Construir / Build** e acompanhe a execução em **Saída do console / Console Output**.
6. Ao final, anote o número da execução, a branch, o commit mostrado no console e o resultado (`SUCCESS` ou `FAILURE`).

O valor padrão de `BRANCH` é `Branch-Caio`. Confira o campo antes de iniciar, principalmente se a intenção for validar `main` ou outra branch. Cada job do projeto tem um valor padrão diferente.

## 4. Etapas do pipeline

| Etapa | O que faz | Se falhar |
| --- | --- | --- |
| Obter código | Apaga o workspace do job e faz checkout da branch informada. | O build termina em `FAILURE`; confira a grafia de `BRANCH` e se a branch foi enviada. |
| Instalar dependências | Executa `npm ci` em `backend`, conforme o `package-lock.json`. | O pipeline para. Nenhum teste roda e nenhum relatório é publicado. |
| Testes de integração | Executa `npm run test:integration` e gera `backend/reports/integration.xml`. | `catchError` marca a etapa e o build como `FAILURE`, mas a próxima etapa ainda roda, para servir de diagnóstico. |
| Cobertura completa | Executa `npm run test:coverage` com toda a suíte. | O build termina em `FAILURE`. |
| Pós-execução (`post always`) | Publica o JUnit, publica o HTML de cobertura e arquiva os relatórios que existirem. | Veja abaixo. |

### Comportamento em falhas

- **Falha em `npm ci`:** nenhum relatório existe, então nada é publicado. O erro relevante é o primeiro mostrado no console.
- **Teste de integração falhando:** o Vitest grava o JUnit mesmo com falhas, e o resultado aparece em **Test Result**. Como a cobertura roda a suíte completa, que inclui os mesmos testes de integração, a cobertura normalmente também falha se o mesmo teste continuar falhando.
- **Cobertura com testes falhando:** por padrão, o Vitest não gera o relatório de cobertura quando há testes falhando (`coverage.reportOnFailure` não está habilitado em `vitest.config.mts`). Nesse caso, a execução não terá o link **Cobertura do backend** nem `backend/coverage` nos artefatos.
- **Teste unitário falhando:** a etapa de integração pode passar, mas a etapa de cobertura falha, pois executa também os testes unitários. O JUnit publicado por este job contém somente os testes de integração; o teste unitário com falha aparece no console. O relatório JUnit dos unitários é publicado pelo job `backend-unit-igor` (veja [unitarios.md](unitarios.md)).
- **Relatório ausente:** depois de publicar o que existir, o pipeline faz duas verificações:
  - `backend/reports/integration.xml` é exigido sempre que a etapa de integração foi tentada, mesmo que algum teste tenha falhado, pois o Vitest grava o JUnit também nesse caso.
  - `backend/coverage/index.html` é exigido somente quando `npm run test:coverage` terminou com sucesso. Se a cobertura falhou, a ausência do HTML não gera um erro adicional.

  Se `npm ci` falhar, nenhuma das etapas de teste é tentada e nenhum relatório é exigido. Essas verificações detectam uma configuração de reporter ou de cobertura quebrada mesmo quando os testes passam.
- **Tempo esgotado:** após 15 minutos o build é interrompido.

Corrija o problema no código, faça commit e push e execute o job novamente. Não é necessário reinstalar o Jenkins.

## 5. Onde consultar os resultados

Na página da execução (por exemplo, **backend-integration-coverage → #N**):

| Resultado | Onde fica | Conteúdo |
| --- | --- | --- |
| Testes de integração | **Test Result / Resultado de testes** | Resultado de `backend/reports/integration.xml`, com os testes que passaram e falharam. |
| Cobertura | Link **Cobertura do backend** no menu da execução | HTML gerado em `backend/coverage/index.html`. Um link com o mesmo nome também aparece na página do job. |
| Resumo textual da cobertura | **Saída do console / Console Output** | Tabela do reporter `text`, impressa pela etapa de cobertura, e a contagem total de testes da suíte completa. |
| Artefatos | **Artefatos / Build Artifacts** | `backend/reports/**` e `backend/coverage/**`, incluindo `integration.xml`, o HTML e `lcov.info`. |

Se o HTML aparecer sem estilos no Jenkins, baixe a pasta `backend/coverage` dos artefatos e abra `index.html` localmente. A Content Security Policy padrão do Jenkins pode restringir parte dos recursos de relatórios publicados.

Os relatórios ficam somente na instância local de quem executou o job e são descartados junto com as execuções mais antigas que as 10 últimas. Guarde as evidências necessárias para a entrega fora do Jenkins, sem credenciais.

## 6. Executar localmente

Use estes comandos para reproduzir o job antes do push. Os comandos são executados na pasta `backend`; `npm ci` recria `node_modules` a partir do lockfile.

**Terminal PowerShell — a partir da raiz do repositório:**

```powershell
Set-Location .\backend
npm ci
npm run build
npm run test:integration
npm run test:coverage
```

| Comando | Resultado |
| --- | --- |
| `npm ci` | Instala as dependências conforme o lockfile, como no Jenkins. |
| `npm run build` | Compila o TypeScript para `backend/dist`. O job de integração não executa esta etapa; o build do backend é feito pelos jobs `backend-build` e `backend-deploy`. Ainda assim, ela detecta erros de tipo antes do push. |
| `npm run test:integration` | Roda os testes de integração e grava `backend/reports/integration.xml`. |
| `npm run test:coverage` | Roda a suíte completa e grava a cobertura em `backend/coverage`. |

**Terminal PowerShell — abrir o relatório de cobertura, ainda em `backend`:**

```powershell
Invoke-Item .\coverage\index.html
```

`backend/reports`, `backend/coverage` e `backend/dist` são ignorados pelo Git. Não force o versionamento desses arquivos.

## 7. Registro histórico

Os resultados abaixo foram registrados em validações anteriores da equipe. Eles **não** foram obtidos na elaboração deste guia, valem somente para os commits testados naquele momento e não são contagens permanentes: o número de testes muda conforme a suíte evolui.

| Validação | Branch | Resultado registrado |
| --- | --- | --- |
| Execução normal | `Branch-Caio` | `SUCCESS`; 5 testes de integração passaram; a suíte completa com cobertura teve 60 testes aprovados; relatórios acessíveis no Jenkins. |
| Falha proposital | Branch separada | Expectativa de `/health` alterada de `200` para `201`; 4 testes de integração passaram, 1 falhou, e o build terminou em `FAILURE`. |
| Nova execução após a falha | `Branch-Caio` | Passou novamente. |

Esse registro mostra que o job identificou uma falha real de integração e voltou a passar sem ela. Não comprova o funcionamento da pipeline completa do projeto.

## 8. Pendências na pipeline completa

Os jobs atuais são independentes entre si e executados manualmente:

| Job | Pipeline | `BRANCH` padrão |
| --- | --- | --- |
| `frontend-build` | [frontend/Jenkinsfile](../../frontend/Jenkinsfile) | `Branch-Gustavo` |
| `backend-unit-igor` | [backend/Jenkinsfile.unit](../../backend/Jenkinsfile.unit) | `Branch-Igor` |
| `backend-integration-coverage` | [backend/Jenkinsfile.integration](../../backend/Jenkinsfile.integration) | `Branch-Caio` |
| `backend-build` | [backend/Jenkinsfile](../../backend/Jenkinsfile) | `Branch-Jose` |
| `backend-deploy` | [backend/Jenkinsfile.deploy](../../backend/Jenkinsfile.deploy) | `Branch-Donatto` |

Ainda falta validar:

- **Encadeamento:** nenhum job dispara outro. O `backend-deploy` executa `npm test` por conta própria antes de publicar e não depende do resultado deste job.
- **Pipeline única:** o `Jenkinsfile` da raiz do repositório está vazio. Não há uma definição que execute build, testes, cobertura e deploy em sequência.
- **Gatilhos:** não há execução automática por push ou PR.
- **Execução em `main`:** após integrar as branches, executar este job e os demais com `BRANCH=main`, para o mesmo commit, e registrar os resultados.
- **Instância limpa:** confirmar que uma instalação nova, construída a partir da `main`, cria todos os jobs com os plugins necessários.
- **Critérios de cobertura:** não há limite mínimo de cobertura configurado; o job publica o relatório, mas não falha por cobertura baixa.

Até que esses pontos sejam verificados, os resultados de cada job valem apenas para a branch e o commit executados.
