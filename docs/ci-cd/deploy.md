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

Qualquer pessoa com Docker consegue baixar e executar a imagem, sem o Jenkins e
sem o código-fonte.

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
     cookie `HttpOnly` sem `Secure` e categorias;
   - recria o contêiner com o **mesmo volume** e a configuração padrão de
     produção: o cadastro e a sessão anteriores continuam válidos, a categoria
     criada antes continua salva e o cookie volta a ter `Secure`.
5. Publica no Docker Hub, **somente quando chamado pela pipeline completa**.
   Uma execução manual do job para após a verificação.
   - O login usa a credencial `dockerhub-credentials` com `withCredentials` e
     `docker login --password-stdin`. O token não aparece no log.
   - O login fica num `DOCKER_CONFIG` temporário desta execução, apagado ao
     sair do script, inclusive em falha.
   - Depois do `docker push`, o digest é lido do registro com
     `docker buildx imagetools inspect` e gravado em `imagem-publicada.txt`
     (artefato do build), também mostrado na descrição da execução.
6. Ao final, com sucesso ou falha, guarda os logs do contêiner em
   `verificacao.log` e remove o contêiner e o volume temporários.

Se qualquer job anterior falhar (build do frontend ou do backend, testes do
frontend, unitários, integração ou cobertura), a pipeline para antes do Deploy
e nada é publicado.

## Executar a imagem publicada

Troque `<SHA>` pelo SHA completo mostrado na descrição do build ou em
`imagem-publicada.txt`. No PowerShell:

```powershell
$IMAGEM = "bunnyzzw/controle-financeiro-c14:<SHA>"
docker pull $IMAGEM

# Volume nomeado para o SQLite: sobrevive à remoção e à recriação do contêiner.
docker volume create controle-financeiro-dados

# COOKIE_SECURE=false porque este teste é por HTTP (veja a seção do cookie).
docker run -d --name controle-financeiro -p 3000:3000 `
  -v controle-financeiro-dados:/data `
  -e COOKIE_SECURE=false `
  $IMAGEM

Invoke-RestMethod http://localhost:3000/health   # deve mostrar status ok
```

Abra `http://localhost:3000` para usar o frontend. A API responde em
`http://localhost:3000/api/...`, o mesmo caminho do proxy do Vite no
desenvolvimento. As rotas sem o prefixo, como `/health`, continuam funcionando.

Para conferir que os dados ficam no volume, recrie o contêiner com o mesmo
volume e entre com a conta criada antes:

```powershell
docker rm -f controle-financeiro
docker run -d --name controle-financeiro -p 3000:3000 `
  -v controle-financeiro-dados:/data -e COOKIE_SECURE=false $IMAGEM
```

Para apagar tudo do teste: `docker rm -f controle-financeiro` e
`docker volume rm controle-financeiro-dados`. Remover o volume apaga o banco.

### Configuração da imagem

| Variável | Padrão na imagem | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta da aplicação dentro do contêiner. Sem a variável, o servidor também usa 3000. |
| `DATABASE_PATH` | `/data/financeiro.sqlite` | Arquivo do SQLite. `/data` é o ponto de montagem do volume. |
| `FRONTEND_DIR` | `/app/public` | Frontend compilado, servido na mesma origem da API. |
| `NODE_ENV` | `production` | Mantido em produção também no teste por HTTP. |
| `COOKIE_SECURE` | (não definida) | `true` ou `false` explícito. Sem ela, vale `NODE_ENV=production`, ou seja, `Secure`. Qualquer outro valor impede a aplicação de subir. |

O contêiner roda como o usuário `node` (uid 1000). A pasta `/data` da imagem
pertence a ele, e um volume nomeado novo herda esse dono na primeira
montagem, então o SQLite consegue gravar o banco e o arquivo de journal. Prefira
volume nomeado: uma pasta do Windows montada com `-v C:\...:/data` não segue
essas permissões.

### Cookie da sessão por HTTP

Em produção o cookie `sessao` é `Secure`, e o navegador só o envia por HTTPS.
O teste local é por `http://localhost`, então use **`COOKIE_SECURE=false`**,
como nos comandos acima. A imagem continua com `NODE_ENV=production`. Ao
publicar atrás de HTTPS, não defina `COOKIE_SECURE`, ou use `true`. A
verificação do Jenkins testa as duas configurações.

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
