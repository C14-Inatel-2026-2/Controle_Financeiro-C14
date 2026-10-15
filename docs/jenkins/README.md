# Jenkins: instalação e uso

Este guia prepara o Jenkins do projeto e explica como executar o build do frontend. Os comandos usam PowerShell e devem ser executados na raiz do repositório, exceto o comando inicial de clonagem.

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

Use uma branch que contenha `compose.jenkins.yaml`, a pasta `infra/jenkins` e `frontend/Jenkinsfile`. O exemplo abaixo utiliza `Branch-Gustavo`; depois que a configuração estiver integrada à `main`, ela também poderá ser usada.

**Terminal PowerShell — na pasta em que deseja guardar o projeto, somente se ainda não tiver um clone:**

```powershell
git clone --branch Branch-Gustavo https://github.com/josematheusrodrigues/Controle_Financeiro-C14.git
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

Execute esta seção uma vez para cada instalação. Se já criou o administrador e conectou o agente, vá para [Uso diário](#5-uso-diário).

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
4. Informe o nome exato da branch no campo **BRANCH**, por exemplo, `Branch-Gustavo` ou `main`. Não use o prefixo `origin/` nem espaços antes ou depois do nome.
5. Clique em **Construir / Build**.
6. Abra a execução no histórico e consulte **Saída do console / Console Output**.

A branch precisa estar publicada no GitHub e conter `frontend/Jenkinsfile`, com `J` maiúsculo. Faça commit e push das alterações que deseja verificar antes de iniciar o build. Escolher `main` só funciona quando esse arquivo já estiver nela.

O job busca o código do GitHub para uma pasta própria do agente. A branch aberta no editor e os arquivos não enviados do seu computador não determinam o código utilizado no build. Não é necessário dar `pull` na branch escolhida para executar o job.

O pipeline executa as seguintes etapas:

| Etapa | O que faz |
| --- | --- |
| Obter código | Limpa o workspace do job e obtém o código da branch informada. Não apaga a pasta em que o desenvolvedor trabalha. |
| Instalar dependências | Executa `npm ci` em `frontend`, usando o lockfile versionado. |
| Build do frontend | Executa `npm run build`, que faz a compilação TypeScript e o build com Vite. |
| Guardar arquivos gerados | Arquiva o conteúdo de `frontend/dist` para consulta e download no Jenkins. |

O resultado esperado é `Finished: SUCCESS`, com os arquivos disponíveis na seção de artefatos da execução. Esse job não executa os testes nem publica a aplicação; essas atividades devem ser configuradas em jobs próprios e não fazem parte deste guia.

Para registrar a validação de um PR, anote o número da execução, a branch e o commit indicado no console. Um resultado anterior não valida novos commits enviados depois. O endereço `localhost` aponta para a máquina de quem o abre: ele não permite que um colega veja seu histórico. Compartilhe evidências sem credenciais ou peça que o colega reproduza a execução.

## 5. Uso diário

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

Não use `docker compose down -v` para encerrar o trabalho: a opção `-v` remove os volumes do projeto e pode apagar os dados da instalação. Não é necessário manter os contêineres ligados entre as sessões. Enquanto estiverem parados, novos commits, pushes ou PRs não iniciarão builds; este job não possui gatilhos automáticos.

### Aplicar atualizações do ambiente

Depois de atualizar os arquivos de infraestrutura no repositório, reconstrua as imagens. Confira antes se há alterações locais que precisam ser preservadas e aguarde os builds em andamento terminarem.

**Terminal PowerShell — na raiz do repositório:**

```powershell
docker compose -f compose.jenkins.yaml up -d --build
```

O Compose recria os contêineres quando necessário e preserva os volumes. Alterar arquivos copiados para a imagem, como `jenkins.yaml` ou `jobs.groovy`, exige a reconstrução; apenas reiniciar o contêiner não atualiza esses arquivos.

Mudanças apenas no código do frontend ou no arquivo do pipeline não exigem reconstruir o ambiente: faça push para a branch e execute o job novamente. As definições de jobs devem continuar sendo alteradas no repositório; edições feitas só pela interface podem ser substituídas quando o JCasC reaplicar a configuração.

## 6. Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| [compose.jenkins.yaml](../../compose.jenkins.yaml) | Define os serviços, a porta local, os volumes e a montagem do segredo. |
| [infra/jenkins/Dockerfile](../../infra/jenkins/Dockerfile) | Constrói a imagem do controlador com plugins e arquivos de configuração. |
| [infra/jenkins/plugins.txt](../../infra/jenkins/plugins.txt) | Define os plugins e suas versões. |
| [infra/jenkins/jenkins.yaml](../../infra/jenkins/jenkins.yaml) | Aplica as configurações do Jenkins por JCasC e carrega os jobs. |
| [infra/jenkins/jobs.groovy](../../infra/jenkins/jobs.groovy) | Cria o job manual e seu parâmetro `BRANCH`. |
| [infra/jenkins/agent/Dockerfile](../../infra/jenkins/agent/Dockerfile) | Constrói o agente com Java, Git, Node.js e npm. |
| [frontend/Jenkinsfile](../../frontend/Jenkinsfile) | Define as etapas do build do frontend. |
| `.secrets/jenkins-agent-secret.txt` | Armazena a credencial local do agente; não é versionado. |

A porta `8081` é usada pelo navegador. Dentro da rede do Compose, o agente acessa o controlador em `http://jenkins:8080/`: `jenkins` é o nome do serviço e `8080` é sua porta interna. Não troque esse endereço por `localhost:8081`, pois `localhost` dentro do agente aponta para o próprio contêiner.

## 7. Problemas comuns

| Sintoma | O que verificar |
| --- | --- |
| Docker não conecta ou não encontra o daemon | Abra o Docker Desktop, aguarde sua inicialização e repita `docker version`. |
| Não encontra `compose.jenkins.yaml` ou o contexto de build | Execute o comando na raiz do repositório e confirme se a branch contém os arquivos de infraestrutura. |
| Porta `8081` ocupada | Identifique a aplicação que utiliza a porta antes de encerrar qualquer processo. Se precisar trocar a porta deste projeto, ajuste também a URL pública em `jenkins.yaml`; a porta interna do controlador continua sendo `8080`. |
| Arquivo do segredo não encontrado | Confira a etapa 3.3 e a extensão exata do arquivo. Na primeira instalação, inicie somente `jenkins` até obter o segredo. |
| Agente desconectado ou `Unauthorized` | Confira se o segredo pertence ao `agent-node-v2` desta instância, sem espaços nem BOM. Não use a senha do administrador. Após corrigir o arquivo, recrie somente o agente com o comando abaixo. |
| Build fica aguardando um executor | Confirme que o agente está conectado, tem a label `node24` e não está ocupado com outro build. O controlador tem zero executores por configuração. |
| Não encontra a revisão ou a branch | Confira a grafia do parâmetro `BRANCH` e se a branch foi enviada ao GitHub. |
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

## 8. Referências

- [Instalação do Jenkins em Docker](https://www.jenkins.io/doc/book/installing/docker/).
- [Imagem oficial do Jenkins: volumes, configuração e plugins](https://github.com/jenkinsci/docker/blob/master/README.md).
- [Integração entre Job DSL e JCasC](https://github.com/jenkinsci/job-dsl-plugin/wiki/JCasC).
- [Docker Compose: iniciar ou recriar serviços](https://docs.docker.com/reference/cli/docker/compose/up/).
- [Docker Compose: parar serviços](https://docs.docker.com/reference/cli/docker/compose/stop/).
