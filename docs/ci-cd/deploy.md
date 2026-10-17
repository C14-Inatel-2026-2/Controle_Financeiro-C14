# Job de deploy local (backend-deploy)

Publica a versão aprovada do backend numa pasta do agente e reinicia a
aplicação, preservando o banco SQLite entre as atualizações.

- Pipeline: `backend/Jenkinsfile.deploy`
- Job declarado em: `infra/jenkins/jobs.groovy`
- Agente: `node24` (o mesmo dos demais jobs)
- Chamado pelo estágio Deploy da [pipeline completa](../jenkins/README.md#5-executar-a-pipeline-completa),
  somente depois de os builds e os testes passarem. Também pode ser executado
  manualmente.

## O que o job faz, em ordem

1. Limpa o workspace e baixa a revisão pedida: o commit recebido em
   `GIT_COMMIT_SHA`, quando chamado pela pipeline, ou a ponta de `BRANCH`, na
   execução manual com o valor padrão. Em seguida, confere que o `HEAD` é essa
   revisão e falha se não for.
2. `npm ci` no backend.
3. `npm test` — é o que torna os arquivos "aprovados". Falhou, nada é publicado
   e a versão que está no ar continua intacta.
4. `npm run build` e conferência de que `dist/server.js` foi gerado.
5. Publica `dist`, `package.json` e `package-lock.json` numa pasta nova e
   instala apenas as dependências de produção (`npm ci --omit=dev`).
6. Encerra o processo anterior, troca a pasta publicada e sobe a aplicação.
7. Verifica `GET /health` antes de dar o build como bem-sucedido.

## Pastas no agente

```
/home/jenkins/agent/deploy/controle-financeiro/
├── app/           versão publicada (substituída a cada deploy)
├── app.anterior/  versão anterior, mantida para conferência
├── data/          banco SQLite — nunca é apagado
├── app.pid        processo que está no ar
└── app.log        saída da aplicação
```

A preservação dos dados vem de um detalhe: a aplicação é iniciada com a pasta
de deploy como diretório atual, e não com a `app/`. Como `abrirBanco()` usa o
caminho relativo `data/financeiro.sqlite`, o banco cai sempre na mesma pasta
`data/`, enquanto a `app/` pode ser trocada a cada deploy.

A pasta fica dentro do volume `jenkins_agent_workdir` (com o nome de projeto
`c14-ci`, o volume se chama `c14-ci_jenkins_agent_workdir`), então sobrevive ao
reinício do contêiner do agente. Só é perdida se o volume for removido, por
exemplo com `docker compose -f compose.jenkins.yaml down -v`.

## Validação da persistência

Validação manual realizada pela equipe em 17/10/2026, na branch
`Branch-Donatto`:

1. Com a aplicação já publicada por um deploy anterior, um registro fictício
   foi criado na tabela `usuarios` de
   `/home/jenkins/agent/deploy/controle-financeiro/data/financeiro.sqlite`,
   usando `abrirBanco()` do código publicado em `app/dist`, executado com
   `docker compose -f compose.jenkins.yaml exec agent-node-v2 node ...`.
2. A `pipeline-completa` foi executada novamente com `BRANCH=Branch-Donatto` e
   terminou em `SUCCESS`, publicando uma nova versão em `app/`.
3. Depois do deploy, o registro foi consultado e manteve o mesmo id e o mesmo
   nome.
4. Em seguida, somente esse registro foi removido, filtrando pelos dados
   fictícios. O comando confirmou 1 remoção.

Isso valida que o arquivo SQLite em `data/` é preservado entre deploys: a troca
de `app/` não apaga nem substitui o banco.

A API publicada ainda não utiliza o banco: as rotas montadas são somente
`GET /` e `GET /health`, e nenhuma delas chama `abrirBanco()`. Por isso, o
registro foi escrito diretamente no arquivo, e cadastro e persistência pela API
não foram validados. Essa validação deve ser repetida quando as rotas passarem a
usar o SQLite.

## Como ver a aplicação pelo navegador (opcional)

A aplicação sobe dentro do contêiner do agente, que não publica portas. Para
abri-la no Windows, acrescente ao serviço `agent-node-v2` do
`compose.jenkins.yaml`:

```yaml
    ports:
      # Expõe a aplicação publicada pelo deploy: Windows 3001 -> contêiner 3000.
      - "127.0.0.1:3001:3000"
```

Depois `docker compose -f compose.jenkins.yaml up -d` e acesse
`http://localhost:3001/health`.
