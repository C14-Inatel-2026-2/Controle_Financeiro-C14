# Job de deploy local (backend-deploy)

Publica a versão aprovada do backend numa pasta do agente e reinicia a
aplicação, preservando o banco SQLite entre as atualizações.

- Pipeline: `backend/Jenkinsfile.deploy`
- Job declarado em: `infra/jenkins/jobs.groovy`
- Agente: `node24` (o mesmo dos demais jobs)

## O que o job faz, em ordem

1. Limpa o workspace e baixa a branch informada no parâmetro `BRANCH`.
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

A pasta fica dentro do volume `jenkins_agent_workdir`, então sobrevive ao
reinício do contêiner do agente. Só é perdida se o volume for removido.

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
