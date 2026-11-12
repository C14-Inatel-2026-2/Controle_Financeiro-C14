# Publicação da imagem no Docker Hub (backend-deploy)

O job `backend-deploy` constrói uma imagem Docker com o frontend e a API, testa
essa imagem num contêiner temporário e a publica no Docker Hub:

- Imagem: [`bunnyzzw/controle-financeiro-c14`](https://hub.docker.com/r/bunnyzzw/controle-financeiro-c14)
- Tag: o SHA completo do commit, por exemplo
  `bunnyzzw/controle-financeiro-c14:3f2c…` (40 caracteres)
- `latest`: atualizada só quando a branch é `main` e o commit ainda é a ponta dela
- Pipeline: `backend/Jenkinsfile.deploy`; imagem: `Dockerfile` e `.dockerignore` na raiz
- Chamado pelo estágio Deploy da [pipeline completa](../jenkins/README.md#5-executar-a-pipeline-completa),
  somente depois de os builds e os testes do mesmo SHA passarem

Qualquer pessoa com Docker compatível com `linux/amd64` consegue baixar e
executar a imagem, sem clonar o projeto e sem instalar Jenkins, Node ou npm.
Veja o [guia rápido](#guia-rápido-executar-a-imagem-publicada).

## Onde cada coisa roda

- **Docker Hub** guarda e distribui a imagem. Ela continua disponível com o
  computador do Caio desligado.
- **A aplicação** roda no computador de quem inicia o contêiner. Cada
  instalação tem o próprio banco, no próprio volume: dados de um computador não
  aparecem em outro.
- **O Jenkins** atual roda no PC do Caio e só executa pipelines com esse
  computador ligado. Para publicar sem ele, veja
  [Quem pode executar e publicar](../jenkins/README.md#quem-pode-executar-e-publicar).
- **Endereço público do site:** o Docker Hub não hospeda a aplicação em
  execução. A hospedagem no Render gratuito, com o banco no Turso, está
  preparada no código, mas **ainda não foi publicada nem validada**. Veja
  [Hospedagem pública no Render com Turso](#hospedagem-pública-no-render-com-turso).

## O que o job faz, em ordem

1. Limpa o workspace e baixa a revisão pedida: o `GIT_COMMIT_SHA` recebido da
   pipeline ou a ponta de `BRANCH`, na execução manual. Confere que o `HEAD` é
   essa revisão e usa o SHA completo como tag.
2. `docker version`: falha logo se o agente não alcança o Docker Desktop.
3. `docker build --pull` com a tag do SHA e o label
   `org.opencontainers.image.revision`.
4. Verifica a imagem:
   - `/app` tem somente `dist node_modules package.json public` e o usuário não é root;
   - sobe um contêiner com um volume temporário e `COOKIE_SECURE=false` e executa
     `infra/jenkins/verificar-imagem.js` dentro dele: `/health`, `/api/health`,
     frontend em `/`, 404 em JSON para `/api/nao-existe`, cadastro, login,
     cookie `HttpOnly` sem `Secure`, categorias e movimentações com e sem
     categoria (401 sem sessão);
   - recria o contêiner com o **mesmo volume** e a configuração padrão de
     produção: o cadastro e a sessão anteriores continuam válidos, as
     categorias e movimentações criadas antes continuam salvas e o cookie volta
     a ter `Secure`.
5. Publica no Docker Hub, **somente quando chamado pela pipeline completa**.
   Uma execução manual do job para após a verificação.
   - A tag do SHA é sempre publicada. `latest` só é atualizada quando
     `BRANCH=main` **e** o SHA ainda é a ponta da `main` no momento da
     publicação. Execuções em outras branches nunca mexem em `latest`.
   - O login usa a credencial `dockerhub-credentials` com `withCredentials` e
     `docker login --password-stdin`. O token não aparece no log.
   - O login fica num `DOCKER_CONFIG` temporário desta execução, apagado ao
     sair do script, inclusive em falha.
   - Depois do `docker push`, o digest é lido do registro com
     `docker buildx imagetools inspect` e gravado em `imagem-publicada.txt`
     (artefato do build), também mostrado na descrição da execução.
   - Chamado pela pipeline completa, o job falha se terminar sem
     `imagem-publicada.txt` com a referência e o digest. A pipeline completa
     confere de novo pela descrição do `backend-deploy` e falha se ela não os traz.
6. Ao final, com sucesso ou falha, guarda os logs do contêiner em
   `verificacao.log` e remove o contêiner e o volume temporários.

Se qualquer job anterior falhar (build do frontend ou do backend, testes do
frontend, unitários, integração ou cobertura), a pipeline para antes do Deploy
e nada é publicado.

## Guia rápido: executar a imagem publicada

Só é preciso o Docker Desktop. Os comandos são para PowerShell e podem ser
executados em qualquer pasta. O exemplo usa a tag já publicada e comprovada
(veja [Evidências registradas](#evidências-registradas)):

- Tag: `5060557ebf4a6ac645b440cf81386703898ec6f6`
- Digest: `sha256:992615103d321f93dd9e8ef86aece8ee7a56eff828267575fc9c7dd393f19d3b`

`latest` ainda não foi publicada: ela só aparece depois de uma pipeline na
`main`. Use sempre a tag do SHA para saber exatamente qual versão está rodando.

### 1. Conferir o Docker Desktop

```powershell
docker version
docker info --format '{{.OSType}}/{{.Architecture}}'
```

O primeiro comando precisa mostrar **Client** e **Server**. Sem o Server, abra o
Docker Desktop e espere iniciar. O segundo deve mostrar `linux/x86_64`. A imagem
só tem a plataforma `linux/amd64`.

### 2. Baixar a imagem pela tag do SHA

```powershell
$IMAGEM = "bunnyzzw/controle-financeiro-c14:5060557ebf4a6ac645b440cf81386703898ec6f6"
docker pull $IMAGEM
```

A última linha do `docker pull` mostra o `Digest`, que deve ser o digest acima.

### 3. Iniciar o contêiner

```powershell
# Uma vez só: o volume guarda o banco SQLite (/data/financeiro.sqlite).
docker volume create controle-financeiro-dados

docker run -d --name controle-financeiro `
  -p 127.0.0.1:3000:3000 `
  -v controle-financeiro-dados:/data `
  -e COOKIE_SECURE=false `
  $IMAGEM
```

- `127.0.0.1:3000:3000` publica a porta só para este computador, e não para a
  rede.
- `COOKIE_SECURE=false` é necessário porque o acesso é por HTTP. Sem ele, o login
  pela API funciona, mas o navegador não devolve o cookie (veja
  [Cookie da sessão por HTTP](#cookie-da-sessão-por-http)).

### 4. Abrir e conferir

```powershell
docker ps --filter "name=^controle-financeiro$"
Invoke-RestMethod http://localhost:3000/health     # status: ok
Start-Process http://localhost:3000
```

O status deve ficar `(healthy)` alguns segundos depois de iniciar. A API também
responde em `http://localhost:3000/api/...`. As rotas sem o prefixo, como
`/health`, continuam funcionando.

### 5. Parar e iniciar de novo

```powershell
docker stop controle-financeiro
docker start controle-financeiro
```

`stop` e `start` reaproveitam o mesmo contêiner, e os dados continuam no volume.
Não repita o `docker run` para um contêiner que já existe.

### 6. Atualizar para outra tag sem perder os dados

```powershell
$IMAGEM = "bunnyzzw/controle-financeiro-c14:<SHA-completo-da-nova-versão>"
docker pull $IMAGEM

# Remove só o contêiner. O volume e o banco continuam.
docker rm -f controle-financeiro

docker run -d --name controle-financeiro `
  -p 127.0.0.1:3000:3000 `
  -v controle-financeiro-dados:/data `
  -e COOKIE_SECURE=false `
  $IMAGEM
```

As migrations do banco são aplicadas sozinhas na primeira execução da versão
nova. Prefira sempre avançar: voltar para uma tag mais antiga com um banco já
migrado não foi testado.

### 7. Conflito de nome ou de porta

| Mensagem | O que fazer |
| --- | --- |
| `Conflict. The container name "/controle-financeiro" is already in use` | O contêiner já existe. Use `docker start controle-financeiro`, ou siga o passo 6 para trocar a imagem. |
| `Bind for 127.0.0.1:3000 failed: port is already allocated` | Outro programa usa a porta. Neste caso o Docker cria o contêiner novo, mas não o inicia: remova-o com `docker rm controle-financeiro` antes de tentar de novo. |

Para descobrir quem ocupa a porta 3000:

```powershell
docker ps --filter "publish=3000"
Get-NetTCPConnection -LocalPort 3000 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }
```

Se a porta for de outro programa, use outra porta só do lado do Windows, por
exemplo `-p 127.0.0.1:3001:3000`, e abra `http://localhost:3001`.

### 8. Apagar tudo

```powershell
docker rm -f controle-financeiro
docker volume rm controle-financeiro-dados   # APAGA o banco: contas, categorias e lançamentos
```

Remover só o contêiner não apaga nada. **Remover o volume apaga o banco
definitivamente.**

### Limitações para quem for demonstrar

Na tag `5060557…`:

- **Funciona na interface:** página inicial, cadastro de conta (grava no banco) e
  prévia de faturas CSV e PDF do Itaú.
- **A tela de login não chama a API.** Ela só confere se os campos foram
  preenchidos e libera a navegação, sem criar sessão. Por isso:
  - a tela de categorias mostra "Faça login para ver suas categorias.";
  - confirmar uma importação de fatura responde 401.
- **Dashboard e Home** mostram dados de exemplo fixos, e não os do banco.
- **Movimentações** não existem nessa tag (`/api/movimentacoes` responde 404).
  Elas entram na próxima imagem, que sai do merge com o trabalho do Igor. Nem
  essa imagem terá uma tela de movimentações: o acesso é só pela API.

Contorno para demonstrar categorias e a confirmação de faturas, sem alterar o
código: depois de criar a conta pela tela, abra o console do navegador (F12 →
Console) em `http://localhost:3000` e entre pela API. O cookie fica guardado
para as telas seguintes:

```javascript
await fetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "seu-email@example.test", senha: "sua-senha" }),
}).then((resposta) => resposta.status)   // 200 = sessão criada
```

Apresente isso como um contorno. O [login pela tela](../autenticacao.md#login-pela-tela)
já existe no código da `Branch-Caio`, mas só chega à imagem depois do merge e de
uma nova publicação. Até lá, a tag `5060557…` continua com as limitações acima.

### Configuração da imagem

| Variável | Padrão na imagem | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta da aplicação dentro do contêiner. Sem a variável, o servidor também usa 3000. |
| `DATABASE_PATH` | `/data/financeiro.sqlite` | Arquivo do SQLite. `/data` é o ponto de montagem do volume. Ignorada quando o Turso está configurado. |
| `TURSO_DATABASE_URL` | (não definida) | URL `libsql://…` do banco no Turso. Definida junto com o token, a aplicação usa só o Turso. |
| `TURSO_AUTH_TOKEN` | (não definida) | Token do banco no Turso. Segredo: só nas variáveis do serviço, nunca no repositório, na imagem ou em mensagens. |
| `FRONTEND_DIR` | `/app/public` | Frontend compilado, servido na mesma origem da API. |
| `NODE_ENV` | `production` | Mantido em produção também no teste por HTTP. |
| `COOKIE_SECURE` | (não definida) | `true` ou `false` explícito. Sem ela, vale `NODE_ENV=production`, ou seja, `Secure`. Qualquer outro valor impede a aplicação de subir. |

Se só uma das variáveis do Turso estiver definida, ou se a URL não começar com
`libsql://` ou `https://`, a aplicação não sobe e explica o motivo. Com o Turso
configurado, uma falha de conexão também impede a subida: a aplicação nunca
volta sozinha para o arquivo local. No Render (`RENDER=true`), subir sem o Turso
é recusado, porque o disco do serviço é apagado a cada reinício.

O contêiner roda como o usuário `node` (uid 1000). A pasta `/data` da imagem
pertence a ele, e um volume nomeado novo herda esse dono na primeira
montagem, então o SQLite consegue gravar o banco e o arquivo de journal. Prefira
volume nomeado: uma pasta do Windows montada com `-v C:\...:/data` não segue
essas permissões.

### Cookie da sessão por HTTP

Em produção o cookie `sessao` é `Secure`, e o navegador só o envia por HTTPS.
O teste local é por `http://localhost`, então use **`COOKIE_SECURE=false`**,
como nos comandos do guia rápido. A imagem continua com `NODE_ENV=production`. Ao
publicar atrás de HTTPS, não defina `COOKIE_SECURE`, ou use `true`. A
verificação do Jenkins testa as duas configurações.

## Hospedagem pública no Render com Turso

**Situação:** preparado e testado localmente, **ainda não publicado**. O
deploy só estará concluído quando a URL pública do Render funcionar e os dados
continuarem lá depois de um reinício e de uma nova publicação.

### Onde ficam os dados

| Ambiente | Banco |
| --- | --- |
| Desenvolvimento (`npm run dev`) | Arquivo `backend/data/financeiro.sqlite`, fora do Git. |
| Testes (local e Jenkins) | libSQL local em memória ou em pasta temporária. Sem rede, sem token e sem acesso ao Turso. |
| Docker no computador | Arquivo `/data/financeiro.sqlite`, no volume `controle-financeiro-dados`. |
| Render | Somente o Turso (`controle-financeiro-c14`), inclusive as sessões de login. O disco do Render não guarda nada. |

O mesmo cliente oficial (`@libsql/client`) atende todos os casos. Veja
[o guia do banco](../../backend/src/database/README.md).

### 1. Obter a URL e um token do banco

Com a [CLI do Turso](https://docs.turso.tech/cli/introduction) autenticada
(`turso auth login`):

```powershell
turso db show controle-financeiro-c14 --url
# libsql://controle-financeiro-c14-<sua-organização>.turso.io   (formato; valor fictício)

# Token limitado a este banco, copiado direto para a área de transferência, sem aparecer na tela.
turso db tokens create controle-financeiro-c14 | Set-Clipboard
```

O token de `turso db tokens create` vale só para esse banco. Sem
`--expiration`, ele não expira: para trocá-lo, crie outro, atualize o Render e
invalide o antigo no Turso. Não use token de grupo nem token da Platform API.
O painel do Turso também mostra a URL e gera o token (banco → *Connect*).

### 2. Inicializar o banco remoto vazio (uma vez)

O banco novo não precisa de comando separado: na primeira partida, a aplicação
aplica as migrations 1 a 6 e só depois abre a porta. Para conferir a conexão
antes do Render, rode o backend compilado uma vez no seu computador, com as
variáveis só nesta janela do PowerShell:

```powershell
Set-Location .\backend
npm ci; npm run build
$env:TURSO_DATABASE_URL = "<URL do passo 1>"
$env:TURSO_AUTH_TOKEN = Get-Clipboard          # o token copiado no passo 1
$env:PORT = "3100"                              # não conflita com o contêiner local
node dist/server.js                             # espere "banco: Turso (remoto)"; encerre com Ctrl+C
Remove-Item Env:TURSO_DATABASE_URL, Env:TURSO_AUTH_TOKEN, Env:PORT

turso db shell controle-financeiro-c14 "SELECT versao FROM migrations ORDER BY versao"   # 1 a 6
```

Se aparecer `Não foi possível iniciar`, a mensagem diz o que falta: variável,
URL inválida ou falha de conexão. O token nunca é impresso.

**Banco novo × seus dados locais:** o caminho acima começa com o banco vazio.
Os dados do seu `backend/data/financeiro.sqlite` ou do volume Docker **não são
enviados automaticamente**. Se quiser levá-los, crie outro banco a partir de
uma cópia do arquivo, com o app local parado:
`turso db create <nome-novo> --from-file <cópia>.sqlite`
([CLI](https://docs.turso.tech/cli/db/create)). Depois use a URL e o token
desse banco. O arquivo inclui contas, hashes de senha e sessões: não o coloque
no repositório.

### 3. Criar o Web Service no Render

Na tela de **Existing Image**:

| Campo | Valor |
| --- | --- |
| Image URL | `docker.io/bunnyzzw/controle-financeiro-c14:<SHA>`, de uma imagem publicada **depois** desta entrega. Imagens anteriores não conhecem o Turso e gravariam no disco temporário. |
| Region | A mesma do banco: Virginia (US East), como o Turso em AWS US East. |
| Instance Type | Free |
| Health Check Path | `/health` |
| Docker Command / Pre-Deploy Command | vazios (as migrations rodam na partida) |
| Environment | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` e `COOKIE_SECURE=true` |

As variáveis ficam só nas configurações do serviço, fora da imagem e do Git.
Não defina `PORT`: o Render informa a porta (10000 por padrão), e a aplicação a
usa, escutando em todas as interfaces. O Render entrega HTTPS e a mesma origem
serve o frontend e `/api`, então o cookie `Secure` funciona sem outra configuração.

### 4. Testar a URL pública e a persistência

1. Abra `https://<serviço>.onrender.com/health` (`{"status":"ok"}`) e o site.
2. Crie uma conta de teste, entre, crie uma categoria e importe uma fatura CSV de exemplo.
3. No Render, use **Manual Deploy → Restart service**. Entre de novo com a mesma
   conta: a categoria e os lançamentos devem continuar lá.
4. Publique de novo (**Manual Deploy → Deploy latest reference**) e repita a conferência.
5. Deixe o serviço sem acesso por mais de 15 minutos. O primeiro acesso demora
   cerca de um minuto, e os dados e a sessão continuam válidos.
6. Confira no Turso: `turso db shell controle-financeiro-c14 "SELECT count(*) FROM usuarios"`.

Registre a data, o SHA da imagem e o resultado em [Evidências registradas](#evidências-registradas).

### Publicar uma versão nova

1. O Jenkins publica a tag do SHA (e `latest`, na `main`) depois dos testes e
   da verificação da imagem.
2. O Render **não** troca de imagem sozinho. Atualize a tag do SHA em
   *Settings → Image URL* e use **Manual Deploy**. Se o serviço usar `latest`,
   use **Deploy latest reference**. O *deploy hook* do serviço também serve,
   com o parâmetro `imgURL` para escolher a tag
   ([Render](https://render.com/docs/deploying-an-image)).
3. As migrations novas são aplicadas na partida. Se o banco falhar, a porta não
   abre, o health check falha e o Render mantém a versão anterior no ar.
4. Antes de publicar uma versão com migration nova, faça uma cópia do banco
   ([Backup e recuperação](#backup-e-recuperação)). É o caso da primeira imagem
   com a migration 6 num Turso que ainda está na versão 5.

### Voltar para a imagem anterior

- Pelo Render: **Rollback** para um deploy anterior (no plano gratuito, só os
  dois mais recentes), ou a tag de SHA anterior em *Image URL* e **Manual Deploy**.
  A imagem precisa continuar no Docker Hub.
- **Não volte para uma imagem anterior a esta entrega:** ela ignora o Turso e
  gravaria no disco temporário do Render.
- As migrations 1 a 5 só acrescentam tabelas e colunas. A **migration 6**
  (metas por usuário) reconstrói a tabela `metas`: as metas existentes ficam
  sem dono (`usuario_id NULL`) e deixam de aparecer para as contas. Uma imagem
  anterior a ela não conhece `usuario_id` e listaria as metas de todas as
  contas juntas. Depois que a migration 6 rodar, não volte para essas imagens.
  Se for preciso, restaure o banco (abaixo) junto com a imagem.
- Se uma versão futura mudar o esquema de forma incompatível, vale o mesmo
  cuidado: a volta exige restaurar o banco junto com a imagem.

### Backup e recuperação

- **Cópia em SQL:** `turso db shell controle-financeiro-c14 .dump > C:\backups\c14-AAAA-MM-DD.sql`,
  fora da pasta do repositório.
- **Restaurar a cópia:** `turso db create controle-financeiro-c14-restaurado --from-dump <arquivo>.sql`,
  e troque a URL e o token no Render para o banco restaurado.
- **Ponto no tempo:** `turso db create <nome-novo> --from-db controle-financeiro-c14 --timestamp 2026-11-12T10:00:00-03:00`,
  dentro da janela de retenção do plano ([preços](https://turso.tech/pricing)).
- Restaure sempre num banco novo e confira antes de trocar o Render.

Comandos em [db shell](https://docs.turso.tech/cli/db/shell) e
[db create](https://docs.turso.tech/cli/db/create).

### Limitações do plano gratuito

Conferidas em 12/11/2026 em [Render Free](https://render.com/docs/free) e
[Turso Pricing](https://turso.tech/pricing). Os limites podem mudar: confira
antes de depender deles.

- O serviço dorme depois de 15 minutos sem tráfego, e o primeiro acesso leva cerca de um minuto.
- Há uma cota mensal de horas de instância gratuitas por workspace. Quando ela acaba, os serviços gratuitos ficam suspensos até o mês seguinte.
- O disco é apagado a cada deploy, reinício ou suspensão, e o plano gratuito não aceita disco persistente. Por isso o banco fica no Turso.
- O Render pode reiniciar o serviço a qualquer momento. Há uma única instância, sem shell.
- O Turso gratuito tem limites de armazenamento, leituras, escritas e retenção para restauração. Veja a página de preços.

## Acesso do agente ao Docker

O agente usa a CLI do Docker e o plugin `buildx`, instalados em
`infra/jenkins/agent/Dockerfile`, e fala com o **Docker Desktop do próprio
computador** pelo socket `/var/run/docker.sock`, montado em
`compose.jenkins.yaml`. Não há um segundo daemon nem contêiner privilegiado.

Esse acesso equivale a ter controle total do Docker Desktop: um job pode criar,
parar ou apagar qualquer contêiner, imagem ou volume da máquina, inclusive os
do Jenkins. Isso é aceitável aqui porque o Jenkins é local, só escuta em
`127.0.0.1:8081` e executa apenas o código do repositório do grupo. Não exponha
a porta do Jenkins na rede e não execute branches de origem desconhecida.

O usuário `jenkins` do agente acessa o socket pelo grupo dono dele, adicionado
com `group_add`. No Docker Desktop esse grupo costuma ser `0`, o padrão. Se o
grupo for outro, crie na raiz do repositório um arquivo `.env`, já ignorado
pelo Git, com `DOCKER_SOCKET_GID=<número>`.

### Preparar o Docker Desktop no Windows

Na raiz do repositório, com o Docker Desktop aberto:

```powershell
# 1. Confere o Compose sem subir nada.
docker compose -f compose.jenkins.yaml config --quiet

# 2. Reconstrói as duas imagens e recria só o que mudou.
#    Os volumes jenkins_home e jenkins_agent_workdir e o arquivo
#    .secrets/jenkins-agent-secret.txt são preservados.
docker compose -f compose.jenkins.yaml up -d --build

# 3. O agente precisa enxergar o Docker Desktop.
docker compose -f compose.jenkins.yaml exec agent-node-v2 docker version
```

O passo 3 deve mostrar as seções **Client** e **Server**. Se aparecer
`permission denied` no socket:

```powershell
docker compose -f compose.jenkins.yaml exec agent-node-v2 ls -ln /var/run/docker.sock
docker compose -f compose.jenkins.yaml exec agent-node-v2 id
```

Coloque o número do grupo do socket (a quarta coluna do `ls -ln`) em
`DOCKER_SOCKET_GID` no `.env` e repita o passo 2. Para isso funcionar, o
`ls -ln` precisa mostrar permissão de escrita para o grupo (`srw-rw----`).

Nunca use `docker compose ... down -v`: a opção `-v` apaga os volumes do
Jenkins.

### Credencial do Docker Hub

1. No Docker Hub, em **Account settings → Personal access tokens**, gere um
   token com permissão **Read & Write**. Copie o token, que só é mostrado uma vez.
2. No Jenkins, em **Gerenciar Jenkins → Credentials → System → Global
   credentials → Add Credentials**:
   - Kind: **Username with password**
   - Username: `bunnyzzw`
   - Password: o token do passo 1, não a senha da conta
   - ID: **`dockerhub-credentials`**
   - Description: Docker Hub — publicação da imagem
3. Salve. O token fica só no Jenkins: não o coloque no repositório, no `.env`
   nem em mensagens.

## Evidências registradas

### Publicação comprovada do commit `5060557`

Execução no Jenkins do PC do Caio, na `Branch-Caio`, **antes** da integração
das movimentações do Igor (PR #34):

| Item | Registro |
| --- | --- |
| Pipeline | `pipeline-completa` #3: `SUCCESS` |
| Deploy | `backend-deploy` #3: `SUCCESS`, com a mensagem `Publicação comprovada` |
| Commit | `5060557ebf4a6ac645b440cf81386703898ec6f6` |
| Imagem | `bunnyzzw/controle-financeiro-c14:5060557ebf4a6ac645b440cf81386703898ec6f6` |
| Digest | `sha256:992615103d321f93dd9e8ef86aece8ee7a56eff828267575fc9c7dd393f19d3b` |
| Artefatos | `imagem-publicada.txt` e `verificacao.log` |
| Conferência fora do Jenkins | `docker pull` feito pelo Caio mostrou o mesmo digest. Em 10/11/2026, `docker buildx imagetools inspect` também mostrou esse digest, com a plataforma `linux/amd64`. |

A verificação daquele deploy conferiu o frontend, `/health`, `/api/health`, o
404 da API, cadastro, login, cookies e categorias. Depois recriou o contêiner
com o mesmo volume e confirmou que usuário, sessão e categorias foram
preservados.

Essa evidência vale **só para o commit `5060557`**. Ela não cobre as
movimentações, que entraram depois.

### Pendente

1. **Integração com as movimentações:** executar a `pipeline-completa` de novo
   na `Branch-Caio`, depois do commit do merge com a `main`. O deploy dessa
   execução passa a verificar também as movimentações.
2. **Depois do merge do PR na `main`:** executar a `pipeline-completa` com
   `BRANCH=main`. É essa execução que publica `latest`, se o SHA ainda for a
   ponta da `main`.

3. **Turso e Render:** publicar uma imagem desta entrega pelo Jenkins, criar o
   serviço no Render e registrar o teste da URL pública e da persistência após
   reinício e nova publicação ([passo 4](#4-testar-a-url-pública-e-a-persistência)).
   Até lá, o modo remoto só foi testado com um servidor libSQL local.

Ao registrar cada execução, anote o número da pipeline e do deploy, o commit, a
referência e o digest de `imagem-publicada.txt`.

## Versão anterior: deploy em pasta do agente

Até esta mudança, o `backend-deploy` copiava o backend para
`/home/jenkins/agent/deploy/controle-financeiro/` e subia `node` dentro do
contêiner do agente. Esse caminho saiu da pipeline. Uma aplicação antiga ainda
em execução termina quando o contêiner do agente é recriado. A pasta continua
no volume `c14-ci_jenkins_agent_workdir` e pode ser removida manualmente
quando não for mais necessária.

Validação manual registrada em 17/10/2026, na branch `Branch-Donatto`, com
aquele deploy: um registro fictício criado diretamente no SQLite publicado
manteve o mesmo id e o mesmo nome após uma nova execução da
`pipeline-completa`, e depois foi removido. Na época, a API publicada ainda não
usava o banco.
