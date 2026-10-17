# Jenkins: instalação e uso

Este guia prepara o Jenkins do projeto e explica como executar o build do frontend e a pipeline completa, que encadeia os cinco jobs do projeto. Os comandos usam PowerShell e devem ser executados na raiz do repositório, exceto o comando inicial de clonagem.

O ambiente utiliza contêineres Linux no Docker Desktop. Não é necessário instalar o Jenkins como serviço do Windows nem instalar Java, Node.js ou npm no computador apenas para executar este pipeline: essas ferramentas estão nas imagens do projeto.

Cada integrante tem sua própria instância, com credenciais, histórico e arquivos gerados independentes. O repositório compartilha as definições do ambiente, não os dados de uma instalação existente.

## 1. Pré-requisitos

- [Git](https://git-scm.com/downloads/win) instalado.
- [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) instalado, iniciado e configurado para usar contêineres Linux. Siga os requisitos de virtualização e WSL 2 indicados pelo instalador.
- Acesso à internet para baixar as imagens, os plugins e as dependências do projeto.
- Porta local `8081` disponível.

**Terminal PowerShell — verificar as ferramentas:**

```powershell
git --version
docker version
docker compose version
docker info --format '{{.OSType}}'
```

Resultados esperados: versões do Git e do Compose, informações de `Client` e `Server` no Docker e `linux` no último comando. Se não houver conexão com o `Server`, abra o Docker Desktop e aguarde a inicialização antes de continuar.

## 2. Obter o projeto

Use uma branch que contenha `compose.jenkins.yaml`, a pasta `infra/jenkins` e `frontend/Jenkinsfile`. O exemplo abaixo utiliza a `main`, que já contém esses arquivos.

**Terminal PowerShell — na pasta em que deseja guardar o projeto, somente se ainda não tiver um clone:**

```powershell
git clone --branch main https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git
Set-Location .\Controle_Financeiro-C14
```

Se já tiver o repositório, abra o terminal na pasta existente. Antes de trocar de branch ou atualizar o código, confira as alterações locais com `git status` e preserve o que ainda não foi commitado.

**Terminal PowerShell — na raiz do repositório, verificar os arquivos:**

```powershell
Test-Path -LiteralPath .\compose.jenkins.yaml
Test-Path -LiteralPath .\infra\jenkins\jobs.groovy
Test-Path -LiteralPath .\frontend\Jenkinsfile
```

Os três resultados devem ser `True`. Não execute os próximos comandos de dentro de `frontend`, `backend` ou `infra`.

## 3. Primeira instalação

Execute esta seção uma vez para cada instalação. Se já criou o administrador e conectou o agente, vá para [Uso diário](#6-uso-diário).

### 3.1. Iniciar somente o controlador

O controlador fornece a interface e gerencia os jobs. Nesta etapa, o agente ainda não deve iniciar, pois sua credencial será obtida após o primeiro acesso.

**Terminal PowerShell — na raiz do repositório:**

```powershell
docker compose -f compose.jenkins.yaml up -d --build jenkins
docker compose -f compose.jenkins.yaml ps
```

O primeiro comando constrói a imagem e inicia somente o serviço `jenkins`. `--build` usa os Dockerfiles do projeto; `-d` mantém o contêiner em segundo plano. O primeiro download e a instalação dos plugins podem demorar.

O resultado esperado é o serviço `jenkins` em execução. A interface pode levar mais alguns instantes para ficar disponível mesmo depois de o contêiner aparecer como `Up`.

Abra [http://localhost:8081](http://localhost:8081).

### 3.2. Desbloquear o Jenkins e criar o administrador

Na primeira inicialização, o Jenkins pode apresentar a tela **Unlock Jenkins**. A senha inicial pertence a essa instalação e fica dentro do contêiner.

**Terminal PowerShell — copiar a senha inicial para a área de transferência, sem imprimi-la no terminal:**

```powershell
docker compose -f compose.jenkins.yaml exec -T jenkins cat /var/jenkins_home/secrets/initialAdminPassword | Set-Clipboard
```

Cole a senha no campo **Administrator password** e continue. Não compartilhe a senha, capturas dessa tela ou o conteúdo da área de transferência.

Os plugins necessários já são instalados pela imagem a partir de `infra/jenkins/plugins.txt`. Se aparecer a seleção de plugins, escolha **Select plugins to install**, desmarque os plugins adicionais e prossiga sem instalar o conjunto sugerido. Isso evita adicionar versões e plugins que não estão previstos no repositório.

Conclua a criação do usuário administrador e guarde suas credenciais. Mantenha a URL da instância como `http://localhost:8081/`, caso o assistente solicite essa informação. Se a instalação já apresentar a tela de login normal, use o administrador existente em vez de repetir o desbloqueio.

> A senha inicial de desbloqueio, a senha do administrador e o segredo do agente têm funções diferentes. Não substitua um pelo outro.

### 3.3. Configurar o segredo do agente

O cadastro `agent-node-v2` é criado pela configuração do projeto. Ele aparecerá desconectado até que seu contêiner seja iniciado com o segredo correto.

1. Acesse **Gerenciar Jenkins / Manage Jenkins → Nós / Nodes**.
2. Abra o agente **agent-node-v2**.
3. Localize as instruções de conexão do agente.
4. Copie somente o valor indicado depois de `-secret`, sem aspas e sem o restante do comando.

Não execute o comando `java -jar agent.jar` mostrado nessa tela no seu terminal: a conexão será feita pelo contêiner do agente.

**Terminal PowerShell — criar a pasta local e abrir o arquivo de credencial:**

```powershell
New-Item -ItemType Directory -Path .\.secrets -Force | Out-Null
notepad .\.secrets\jenkins-agent-secret.txt
```

No editor, salve apenas o segredo em uma linha, sem espaços adicionais. Use codificação **UTF-8 sem BOM** e confirme que o nome é exatamente `jenkins-agent-secret.txt`, sem uma segunda extensão `.txt`. Se o arquivo já existir, não substitua uma credencial válida por outra de uma instalação diferente.

**Terminal PowerShell — conferir a existência e a proteção pelo Git, sem mostrar o conteúdo:**

```powershell
Test-Path -LiteralPath .\.secrets\jenkins-agent-secret.txt -PathType Leaf
git check-ignore -v .secrets/jenkins-agent-secret.txt
```

O primeiro comando deve retornar `True`. O segundo deve apontar a regra `/.secrets/` do `.gitignore`. Se o arquivo não estiver ignorado, corrija isso antes de fazer commits; nunca use `git add -f` nessa pasta.

O segredo deve ser obtido na instância de cada integrante. Não copie o segredo de um colega e não o coloque no Compose, no README, em issues ou em mensagens do grupo. O [mecanismo de secrets do Compose](https://docs.docker.com/compose/how-tos/use-secrets/) monta o arquivo apenas no serviço autorizado; o arquivo original continua sendo uma credencial sensível no computador.

### 3.4. Iniciar o agente e conferir a conexão

**Terminal PowerShell — na raiz do repositório:**

```powershell
docker compose -f compose.jenkins.yaml config --quiet
docker compose -f compose.jenkins.yaml up -d --build
docker compose -f compose.jenkins.yaml ps
```

O primeiro comando valida a configuração. Se apresentar erro, resolva-o antes de executar os seguintes. O segundo inicia os dois serviços e constrói o ambiente do agente com as ferramentas de build.

Confirme que `jenkins` e `agent-node-v2` estão em execução. Na interface, o agente deve aparecer conectado e disponível. `Up` no Docker, sozinho, não comprova que o agente foi autenticado pelo Jenkins.

**Terminal PowerShell — consultar as mensagens recentes do agente:**

```powershell
docker compose -f compose.jenkins.yaml logs --tail 50 agent-node-v2
```

Mensagens como `WebSocket connection open` e `Connected`, sem uma desconexão posterior, indicam conexão estabelecida. Recusas temporárias enquanto o controlador está iniciando podem ser seguidas por novas tentativas; erros persistentes devem ser investigados.

## 4. Executar o build do frontend

O job `frontend-build` é criado automaticamente a partir da configuração, mas sua execução é manual. Não é necessário criar outro job pela interface.

1. Abra [o Jenkins](http://localhost:8081/) e entre com seu usuário.
2. Abra **frontend-build**.
3. Clique em **Construir com parâmetros / Build with Parameters**.
4. Informe o nome exato da branch no campo **BRANCH**, por exemplo, `main` ou `Branch-Gustavo`. Não use o prefixo `origin/` nem espaços antes ou depois do nome.
5. Mantenha o campo **GIT_COMMIT_SHA** com o valor padrão `refs/heads/${BRANCH}`, para usar a ponta da branch informada. Veja [Execução manual dos jobs individuais](#execução-manual-dos-jobs-individuais).
6. Clique em **Construir / Build**.
7. Abra a execução no histórico e consulte **Saída do console / Console Output**.

A branch precisa estar publicada no repositório `C14-Inatel-2026-2/Controle_Financeiro-C14` e conter `frontend/Jenkinsfile`, com `J` maiúsculo. Faça commit e push das alterações que deseja verificar antes de iniciar o build.

O job busca o código do GitHub para uma pasta própria do agente. A branch aberta no editor e os arquivos não enviados do seu computador não determinam o código utilizado no build. Não é necessário dar `pull` na branch escolhida para executar o job.

O pipeline executa as seguintes etapas:

| Etapa | O que faz |
| --- | --- |
| Obter código | Limpa o workspace do job e obtém o código da branch informada. Não apaga a pasta em que o desenvolvedor trabalha. |
| Instalar dependências | Executa `npm ci` em `frontend`, usando o lockfile versionado. |
| Build do frontend | Executa `npm run build`, que faz a compilação TypeScript e o build com Vite. |
| Guardar arquivos gerados | Arquiva o conteúdo de `frontend/dist` para consulta e download no Jenkins. |

O resultado esperado é `Finished: SUCCESS`, com os arquivos disponíveis na seção de artefatos da execução. Esse job não executa os testes nem publica a aplicação; essas atividades são feitas por jobs próprios, que podem ser executados individualmente ou em sequência pela [pipeline completa](#5-executar-a-pipeline-completa). Consulte os guias específicos:

- [Testes unitários do backend](unitarios.md): job `backend-unit-igor`.
- [Integração e cobertura do backend](backend-integracao-cobertura.md): job `backend-integration-coverage`.
- [Deploy local do backend](../ci-cd/deploy.md): job `backend-deploy`.

Para registrar a validação de um PR, anote o número da execução, a branch e o commit indicado no console. Um resultado anterior não valida novos commits enviados depois. O endereço `localhost` aponta para a máquina de quem o abre: ele não permite que um colega veja seu histórico. Compartilhe evidências sem credenciais ou peça que o colega reproduza a execução.

## 5. Executar a pipeline completa

O job `pipeline-completa`, definido pelo [Jenkinsfile](../../Jenkinsfile) da raiz do repositório, executa os cinco jobs do projeto em sequência, todos sobre o mesmo commit:

| Estágio | Jobs | O que acontece |
| --- | --- | --- |
| Resolver commit | — | Obtém o SHA completo da ponta de `BRANCH` uma única vez. |
| Build | `frontend-build` e `backend-build`, em paralelo | Compilam o frontend e o backend e arquivam os arquivos gerados. |
| Testes | `backend-unit-igor` e `backend-integration-coverage`, em paralelo | Publicam o JUnit dos unitários, o JUnit de integração e a cobertura. |
| Deploy | `backend-deploy` | Testa, compila e publica o backend no agente, preservando o SQLite. Veja o [guia do deploy](../ci-cd/deploy.md). |

Um estágio só começa se o anterior terminou com sucesso. Se qualquer job falhar, a pipeline termina em `FAILURE` e os estágios seguintes, inclusive o Deploy, não são executados. Dentro de um estágio paralelo, o outro job continua até o fim, para que os dois resultados fiquem registrados.

A pipeline também é manual: não há gatilho por push ou PR.

### Pré-requisitos

- Ambiente instalado e agente conectado, conforme a [seção 3](#3-primeira-instalação).
- Imagem do controlador reconstruída depois de atualizar `infra/jenkins/jobs.groovy`, como em [Aplicar atualizações do ambiente](#aplicar-atualizações-do-ambiente). Confira que os cinco jobs mostram os parâmetros **BRANCH** e **GIT_COMMIT_SHA** em **Build with Parameters**. Um job chamado pela pipeline sem esse parâmetro declarado falha de propósito, em vez de executar outro commit.
- A branch escolhida publicada no GitHub, contendo o `Jenkinsfile` da raiz, os cinco Jenkinsfiles e `infra/jenkins/confirmar-revisao.groovy`.

### Como executar

1. Faça commit e push do que deseja verificar.
2. Abra [o Jenkins](http://localhost:8081/), abra **pipeline-completa** e clique em **Construir com parâmetros / Build with Parameters**.
3. Informe a branch em **BRANCH**, sem `origin/` e sem espaços. O padrão é `main`.
4. Clique em **Construir / Build** e acompanhe a execução em **Saída do console / Console Output**.
5. Ao final, anote o número da execução da pipeline, o commit escolhido e o número e o resultado de cada um dos cinco jobs.

O agente tem um único executor. O orquestrador não o ocupa enquanto espera: ele roda no controlador e aloca o agente só durante o estágio Resolver commit. Por isso, os jobs de um mesmo estágio paralelo entram na fila e executam um de cada vez. O limite da pipeline inteira é de 60 minutos. Evite iniciar jobs individuais enquanto a pipeline estiver em execução, pois eles disputam o mesmo executor.

### Como o SHA é repassado e conferido

1. **Resolução:** o orquestrador valida o nome de `BRANCH` e executa `git ls-remote` no agente. A saída precisa conter exatamente um SHA de 40 caracteres hexadecimais para `refs/heads/<BRANCH>`. Caso contrário, a pipeline falha sem chamar nenhum job. O console mostra `Commit escolhido: <sha>`, e a descrição da execução mostra `<branch> @ <8 primeiros caracteres>`.
2. **Repasse:** os cinco jobs recebem `BRANCH` e `GIT_COMMIT_SHA=<sha>`.
3. **Carregamento e checkout:** em cada job, o [jobs.groovy](../../infra/jenkins/jobs.groovy) usa `${GIT_COMMIT_SHA}` como revisão do Git. O mesmo SHA é usado para carregar o Jenkinsfile do job e para o `checkout scm` da etapa Obter código. No console, a obtenção do código aparece como `Checking out Revision <sha> (detached)`.
4. **Conferência:** logo após o checkout, cada Jenkinsfile carrega [confirmar-revisao.groovy](../../infra/jenkins/confirmar-revisao.groovy), que compara `git rev-parse HEAD` com o SHA recebido. Se forem iguais, o console mostra `Revisão confirmada: HEAD <sha> é o GIT_COMMIT_SHA solicitado`. Se forem diferentes, o job falha antes de instalar dependências.

Assim, um push feito durante a execução não muda o código usado pelos jobs seguintes. Se o commit escolhido deixar de existir no GitHub, por exemplo após um force-push, o job falha: não há substituição silenciosa pela ponta atual da branch.

O deploy compila o backend novamente, a partir do mesmo SHA; ele não reaproveita os arquivos arquivados pelo `backend-build`.

### Execução manual dos jobs individuais

Os cinco jobs continuam podendo ser executados sozinhos. Na execução manual:

- Mantenha **GIT_COMMIT_SHA** com o valor padrão `refs/heads/${BRANCH}`. O plugin Git substitui `${BRANCH}` e usa a ponta da branch informada, como antes da pipeline. O console mostra `Execução manual sem SHA: HEAD <sha> é a ponta de <branch>`.
- Para repetir um commit específico, informe o SHA completo, com 40 caracteres hexadecimais minúsculos. Valores abreviados ou inválidos fazem o job falhar.
- Não deixe o campo vazio. Com o campo vazio, o plugin Git considera qualquer branch antes de o Jenkinsfile ser carregado.

A substituição de `${BRANCH}` dentro do valor de `GIT_COMMIT_SHA` depende de o plugin Git expandir variáveis duas vezes ao escolher a revisão, comportamento confirmado no código da versão `git:5.10.1`, fixada em [plugins.txt](../../infra/jenkins/plugins.txt). Ao atualizar o plugin, repita uma execução manual sem SHA e uma execução da pipeline.

### Validações registradas

Validações manuais realizadas pela equipe em 17/10/2026, numa instância local já existente:

| Validação | Branch e commit | Resultado registrado |
| --- | --- | --- |
| Sucesso | `Branch-Donatto`, `31c1aa31647bb2f105ebc5f3556940353980a1c9` | Os cinco jobs passaram usando o mesmo SHA: `frontend-build` #1, `backend-build` #3, `backend-unit-igor` #1, `backend-integration-coverage` #4 e `backend-deploy` #1. |
| Bloqueio do deploy | `ci/validar-bloqueio-deploy`, `de977207098134a4820f4560226075486ad2781d` | Com um teste unitário que falha de propósito, os builds passaram, e `backend-unit-igor` #2 e `backend-integration-coverage` #5 falharam. A falha também no job de integração é esperada, pois a etapa de cobertura executa a suíte completa, que inclui os unitários. A pipeline terminou em `FAILURE` sem executar o estágio Deploy. |
| Persistência do SQLite | `Branch-Donatto` | Um registro fictício criado no banco publicado manteve o mesmo id e nome após uma nova execução da pipeline com `SUCCESS`. Detalhes no [guia do deploy](../ci-cd/deploy.md#validação-da-persistência). |

A branch `ci/validar-bloqueio-deploy` existe apenas para essa validação e não deve ser integrada à `main`.

Ainda não foram realizados:

- **Execução em `main`:** executar a pipeline com `BRANCH=main`, depois de integrar as branches, e registrar os resultados.
- **Instância limpa:** confirmar que uma instalação nova, construída a partir da `main`, cria os seis jobs com os parâmetros e plugins necessários.
- **Gatilhos automáticos:** a pipeline e os jobs continuam sendo executados manualmente.
- **Uso do banco pela API:** a aplicação publicada ainda não lê nem grava no SQLite, então cadastro e persistência pela API não foram validados.

## 6. Uso diário

### Ligar o ambiente

Abra o Docker Desktop e aguarde a inicialização. Não é necessário repetir o desbloqueio, criar outro administrador ou obter novamente o segredo do agente enquanto os dados da instalação forem preservados.

**Terminal PowerShell — na raiz do repositório:**

```powershell
docker compose -f compose.jenkins.yaml up -d
```

Depois, acesse [http://localhost:8081](http://localhost:8081) e execute o job com a branch desejada.

### Parar sem apagar os dados

Espere os builds terminarem antes de parar o ambiente.

**Terminal PowerShell — na raiz do repositório:**

```powershell
docker compose -f compose.jenkins.yaml stop
```

Esse comando para os contêineres sem removê-los. Os volumes preservam usuários, configurações, histórico e artefatos ainda retidos pelo Jenkins. O pipeline limita o histórico a dez execuções; não use o Jenkins como único armazenamento de evidências necessárias para a entrega.

Não use `docker compose down -v` para encerrar o trabalho: a opção `-v` remove os volumes do projeto e pode apagar os dados da instalação. Não é necessário manter os contêineres ligados entre as sessões. Enquanto estiverem parados, novos commits, pushes ou PRs não iniciarão builds; nenhum job do projeto possui gatilhos automáticos.

### Aplicar atualizações do ambiente

Depois de atualizar os arquivos de infraestrutura no repositório, reconstrua as imagens. Confira antes se há alterações locais que precisam ser preservadas e aguarde os builds em andamento terminarem.

**Terminal PowerShell — na raiz do repositório:**

```powershell
docker compose -f compose.jenkins.yaml up -d --build
```

O Compose recria os contêineres quando necessário e preserva os volumes. Alterar arquivos copiados para a imagem, como `jenkins.yaml` ou `jobs.groovy`, exige a reconstrução; apenas reiniciar o contêiner não atualiza esses arquivos.

Mudanças apenas no código ou nos Jenkinsfiles não exigem reconstruir o ambiente: faça push para a branch e execute o job novamente. As definições de jobs devem continuar sendo alteradas no repositório; edições feitas só pela interface podem ser substituídas quando o JCasC reaplicar a configuração.

## 7. Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| [compose.jenkins.yaml](../../compose.jenkins.yaml) | Define os serviços, a porta local, os volumes e a montagem do segredo. |
| [infra/jenkins/Dockerfile](../../infra/jenkins/Dockerfile) | Constrói a imagem do controlador com plugins e arquivos de configuração. |
| [infra/jenkins/plugins.txt](../../infra/jenkins/plugins.txt) | Define os plugins e suas versões. |
| [infra/jenkins/jenkins.yaml](../../infra/jenkins/jenkins.yaml) | Aplica as configurações do Jenkins por JCasC e carrega os jobs. |
| [infra/jenkins/jobs.groovy](../../infra/jenkins/jobs.groovy) | Cria os seis jobs manuais, com os parâmetros `BRANCH` e, nos cinco jobs chamados pela pipeline, `GIT_COMMIT_SHA`. |
| [Jenkinsfile](../../Jenkinsfile) | Define a pipeline completa: resolve o commit e encadeia os cinco jobs. |
| [infra/jenkins/confirmar-revisao.groovy](../../infra/jenkins/confirmar-revisao.groovy) | Confere, em cada job, se o código obtido é a revisão pedida. |
| [infra/jenkins/agent/Dockerfile](../../infra/jenkins/agent/Dockerfile) | Constrói o agente com Java, Git, Node.js e npm. |
| [frontend/Jenkinsfile](../../frontend/Jenkinsfile) | Define as etapas do build do frontend. |
| [backend/Jenkinsfile](../../backend/Jenkinsfile) | Define o build do backend. |
| [backend/Jenkinsfile.unit](../../backend/Jenkinsfile.unit) | Define os testes unitários do backend. |
| [backend/Jenkinsfile.integration](../../backend/Jenkinsfile.integration) | Define as etapas de integração e cobertura do backend. |
| [backend/Jenkinsfile.deploy](../../backend/Jenkinsfile.deploy) | Define o deploy local do backend. |
| `.secrets/jenkins-agent-secret.txt` | Armazena a credencial local do agente; não é versionado. |

A porta `8081` é usada pelo navegador. Dentro da rede do Compose, o agente acessa o controlador em `http://jenkins:8080/`: `jenkins` é o nome do serviço e `8080` é sua porta interna. Não troque esse endereço por `localhost:8081`, pois `localhost` dentro do agente aponta para o próprio contêiner.

## 8. Problemas comuns

| Sintoma | O que verificar |
| --- | --- |
| Docker não conecta ou não encontra o daemon | Abra o Docker Desktop, aguarde sua inicialização e repita `docker version`. |
| Não encontra `compose.jenkins.yaml` ou o contexto de build | Execute o comando na raiz do repositório e confirme se a branch contém os arquivos de infraestrutura. |
| Porta `8081` ocupada | Identifique a aplicação que utiliza a porta antes de encerrar qualquer processo. Se precisar trocar a porta deste projeto, ajuste também a URL pública em `jenkins.yaml`; a porta interna do controlador continua sendo `8080`. |
| Arquivo do segredo não encontrado | Confira a etapa 3.3 e a extensão exata do arquivo. Na primeira instalação, inicie somente `jenkins` até obter o segredo. |
| Agente desconectado ou `Unauthorized` | Confira se o segredo pertence ao `agent-node-v2` desta instância, sem espaços nem BOM. Não use a senha do administrador. Após corrigir o arquivo, recrie somente o agente com o comando abaixo. |
| Build fica aguardando um executor | Confirme que o agente está conectado, tem a label `node24` e não está ocupado com outro build. O controlador tem zero executores por configuração. |
| Não encontra a revisão ou a branch | Confira a grafia do parâmetro `BRANCH` e se a branch foi enviada ao GitHub. Em execução manual, confira se `GIT_COMMIT_SHA` está com o valor padrão ou com um SHA completo existente. |
| Job falha com `difere do GIT_COMMIT_SHA` ou `sem um GIT_COMMIT_SHA válido` | O código obtido não é o commit pedido, ou o job ainda não declara o parâmetro. Reconstrua a imagem do controlador para reaplicar `jobs.groovy` e execute novamente. |
| Não encontra `frontend/Jenkinsfile` | Confira o caminho e as maiúsculas no GitHub, na branch selecionada, não apenas no computador. |
| O job não aparece | Confira o `COPY` de `jobs.groovy`, o bloco `jobs` no JCasC e se a imagem foi reconstruída após a alteração. Consulte os logs do controlador. |
| `npm ci` falha | Leia o primeiro erro do console. Se o manifesto e o lockfile estiverem inconsistentes, corrija e versione os arquivos no projeto; não contorne a falha trocando o pipeline para `npm install`. Falhas de rede também devem ser verificadas. |
| TypeScript ou Vite falha | Corrija o erro indicado no código, faça commit e push e execute novamente o job. Não é necessário reinstalar o Jenkins. |

**Terminal PowerShell — somente após corrigir a credencial de um agente desconectado, sem build em andamento:**

```powershell
docker compose -f compose.jenkins.yaml up -d --force-recreate --no-deps agent-node-v2
```

**Terminal PowerShell — consultar logs recentes do controlador para diagnóstico:**

```powershell
docker compose -f compose.jenkins.yaml logs --tail 100 jenkins
```

Os logs da primeira inicialização podem conter a senha de desbloqueio. Revise e remova credenciais antes de compartilhar qualquer trecho. Não apague os volumes como primeira tentativa de resolver um erro.

## 9. Referências

- [Instalação do Jenkins em Docker](https://www.jenkins.io/doc/book/installing/docker/).
- [Imagem oficial do Jenkins: volumes, configuração e plugins](https://github.com/jenkinsci/docker/blob/master/README.md).
- [Integração entre Job DSL e JCasC](https://github.com/jenkinsci/job-dsl-plugin/wiki/JCasC).
- [Docker Compose: iniciar ou recriar serviços](https://docs.docker.com/reference/cli/docker/compose/up/).
- [Docker Compose: parar serviços](https://docs.docker.com/reference/cli/docker/compose/stop/).
