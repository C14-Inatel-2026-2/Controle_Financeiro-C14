# Validação de pull requests no Jenkins

## Como funciona

- O job `pr-validacao` ([jobs.groovy](../../infra/jenkins/jobs.groovy)) consulta o GitHub a cada 2 minutos. Não há webhook: o GitHub não acessa este Jenkins, que continua disponível só em `localhost:8081`.
- Para cada PR aberto a partir de uma branch deste repositório, o Jenkins mescla a branch do PR com a ponta atual da branch de destino (a `main`) **só no workspace do agente**. Nenhuma branch do GitHub é alterada.
- O [Jenkinsfile.pr](../../Jenkinsfile.pr) roda os mesmos comandos da pipeline completa, sem cobertura, sem imagem e sem deploy: frontend (`npm test` e `npm run build`), build do backend, testes unitários e testes de integração.
- O resultado vira um status no último commit do PR, com o nome `continuous-integration/jenkins/pr-merge`: pendente durante a execução, depois sucesso ou falha.
- O Jenkins valida de novo quando o PR recebe um commit novo e quando a `main` muda. Conflito com a `main` faz a mesclagem falhar e reprova o PR.
- PRs vindos de forks não são construídos, porque executariam código de fora do grupo no PC do Caio. Esses PRs ficam sem status, e a pessoa autora deve abrir o PR a partir de uma branch do repositório.
- A `pipeline-completa` e a publicação no Docker Hub continuam como antes, executadas manualmente.

## O que precisa estar ligado

O PC do Caio, o Docker Desktop e os contêineres `jenkins` e `agent-node-v2` (`docker compose -f compose.jenkins.yaml up -d`), com acesso à internet. O agente tem um executor: a validação espera na fila se a `pipeline-completa` estiver rodando.

## Configuração única

1. **Token do GitHub.** Em GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic), crie um token com expiração e **somente** o escopo `repo:status`. Ele serve para publicar o status e para consultar a API com o limite de 5000 requisições por hora (sem token, o limite é de 60 por hora e o Jenkins fica esperando). Se a organização bloquear tokens classic, use um token fine-grained para este repositório com *Commit statuses: Read and write* e aguarde a aprovação da organização.
2. **Credencial no Jenkins.** Em Gerenciar Jenkins → Credentials → System → Global credentials → Add Credentials, escolha *Username with password*: usuário do GitHub, senha = token, ID `github-pr-status`. O token fica só no Jenkins; não o coloque no repositório.
3. **Aplicar o job.** Na raiz do repositório, com a branch que contém estes arquivos: `docker compose -f compose.jenkins.yaml up -d --build jenkins`. Isso reconstrói o controlador e preserva o volume, como em [Aplicar atualizações do ambiente](README.md#aplicar-atualizações-do-ambiente).
4. **Regra de merge, só depois de ver o status funcionando num PR de teste.** Uma pessoa com papel de administrador do repositório ou dona da organização configura a proteção da `main` (veja [Regra proposta](#regra-proposta-para-a-main)).

## Como conferir o resultado

- No PR, na lista de checks perto do botão de merge: `continuous-integration/jenkins/pr-merge`.
- No Jenkins: **pr-validacao** → **PR-<número>** → execução → *Console Output*. A linha `Testando <sha> (pais: <main> <PR>)` mostra o commit de mescla testado. O link **Details** do PR aponta para `localhost:8081`, então só abre no PC do Caio.

## Como executar novamente

- Faça push de um commit novo no PR: a próxima consulta (até 2 minutos) inicia a validação.
- Sem commit novo: no Jenkins, **pr-validacao** → **Scan Repository Now**. Depois, se necessário, abra **PR-<número>** → **Build Now**.

## Quando o Jenkins estiver indisponível

O PR fica com o status pendente ou sem status, e a regra impede o merge. Nada é perdido: quando o Jenkins voltar, a primeira consulta valida os PRs abertos. Se o merge for urgente, quem administra o repositório pode fazer o merge pela opção de contornar a regra ou desativar a regra temporariamente, registrando no PR que a validação não rodou e rodando os testes localmente antes.

## Limitações

- O tempo entre o push e o início da validação é de até 2 minutos, mais a fila do agente.
- Só o Caio vê os logs. As outras pessoas veem no PR apenas o resultado e a descrição.
- O código dos PRs roda no agente, que tem acesso ao Docker Desktop do PC do Caio. Isso é aceitável porque só membros do grupo com acesso de escrita abrem PRs deste repositório.
- Depois que a `main` muda, o status antigo continua no PR até a nova validação terminar.

## Regra proposta para a main

Proteção da branch `main`, sem exigir aprovação, para manter a revisão e o merge manuais como hoje:

```json
{
  "required_status_checks": { "strict": false, "contexts": ["continuous-integration/jenkins/pr-merge"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
```

- `strict: false`: o PR não precisa ser atualizado com a `main` antes do merge, porque o próprio Jenkins já testa a mescla com a `main` atual e repete a validação quando ela muda.
- `enforce_admins: false`: administradores conseguem contornar a regra em emergência.
- Aplicação, por um administrador: `gh api -X PUT repos/C14-Inatel-2026-2/Controle_Financeiro-C14/branches/main/protection --input regra-main.json`. Também dá para fazer em Settings → Branches → Add branch protection rule, marcando *Require a pull request before merging* (0 aprovações) e *Require status checks to pass* com o check acima.
