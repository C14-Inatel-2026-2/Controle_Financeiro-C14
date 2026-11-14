# Uso de IA

Registros separados por integrante, com ferramentas e modelos utilizados, finalidades, prompts e o que foi aceito, ajustado ou descartado.

## Caio

### Claude Code

**Modelo:** Claude Opus 5.5 — confirmar a identificação na interface.

#### Para que utilizei

- **Implementação:** cadastro ligado à API, autenticação, categorias por usuário, sessão no frontend, botão Sair e ajustes de navegação.
- **Testes:** criação e ajuste de testes unitários, integração e mocks com Vitest, além da execução de lint, build e cobertura.
- **Refactorings:** extração do tratamento de senhas para `senhas.ts` e da lógica de categorias para `useCategorias`, preservando o comportamento (PR #51).
- **Análise:** auditorias do repositório, diagnóstico de erros e resolução de conflitos nos arquivos.
- **Documentação:** atualização do README, guias e evidências.
- **DevOps:** imagem Docker, publicação no Docker Hub, validação de PRs no Jenkins, suporte ao Turso e deploy automático no Render.

Vários prompts enviados ao Claude foram estruturados com apoio do ChatGPT e ajustados por mim conforme a entrega.

#### Prompts reais — trechos

**1. Refactorings**

> Implemente dois refactorings na Branch-Caio para a entrega final de C14, preservando o comportamento atual. [...] Refactoring 1 — Extrair o tratamento de senhas [...] Refactoring 2 — Separar lógica e apresentação de categorias [...] Extraia a lógica para um hook useCategorias, mantendo a tela responsável pela apresentação.

**2. Correção no Jenkins**

> A execução real da pipeline-completa na Branch-Caio falhou antes de iniciar os estágios: WorkflowScript: 114: spread not yet supported for CPS transformation [...] Corrija na Branch-Caio substituindo o operador spread por uma forma compatível com Jenkins CPS, como collect { it.trim() }, preservando a validação da publicação e a extração do digest.

**3. Implementação do login**

> Agora faça só a Etapa 2, login no backend, na Branch-Caio. Rode os testes e me mostre o diff. Eu faço o commit e o push.

#### O que foi aceito, ajustado ou descartado

- **Aceito:** implementações de autenticação, categorias, testes, refactorings e infraestrutura, após revisão e validação.
- **Ajustado:** condição de publicação no Docker Hub, extração do digest, incompatibilidade com Jenkins CPS e descoberta de PRs com conflito.
- **Descartado:** sugestões fora do escopo, uso de webhook ou túnel para o Jenkins local e duplicação dos prints de evidência no repositório.

#### Minha participação

O Claude auxiliou na escrita e alteração do código, testes e documentação. Eu executei os comandos de versionamento das minhas entregas, abri PRs, configurei os serviços e credenciais e conferi os resultados das pipelines e dos fluxos no site.

### ChatGPT

**Modelo:** Sol 6.1, Esforço Médio — conforme identificação da interface utilizada.

#### Para que utilizei

- **Liderança:** organização das demandas, definição de prioridades e divisão de responsabilidades.
- **Prompts:** estruturação de instruções para o Claude, definindo escopo, limites e verificações.
- **Análise:** revisão de commits e PRs, interpretação de erros e orientação sobre Git, branches e merges.
- **Documentação:** apoio à organização e atualização dos registros do projeto.
- **CI/CD e deploy:** orientação sobre Jenkins, Docker Hub, Render e Turso, incluindo validação das pipelines e automação.

#### Prompts reais e exemplos adaptados

**1. Organização das tarefas — adaptado**

> Levando em conta a função de cada integrante e o que ainda falta no projeto, separa as tarefas por pessoa e indica as prioridades para eu passar no grupo.

**2. Planejamento do deploy — adaptado**

> Chat, preciso focar agora no deploy, seguindo as orientações do monitor. A imagem já está publicada no Docker Hub. Me ajuda a analisar as opções e organizar os próximos passos?

**3. Preparação dos refactorings — exemplo reconstruído**

> Chat, preciso fazer a entrega dos dois refactorings que te mandei no print. Me ajuda a montar um prompt pro Claude analisar minha parte do projeto e identificar o que mais precisa de refactoring e quais opções são mais simples, sem mudar o comportamento? Inclui testes antes e depois e pede pra trabalhar só na minha branch, sem criar outra e sem fazer add, commit ou push.

**4. Automação — adaptado**

> Dá para automatizar esse fluxo para eu não precisar iniciar tudo pelo Jenkins? Queria deixar ele rodando e o site atualizar depois do merge na main.

**5. Persistência no deploy — transcrição original**

> chat tem alguma outra opção pra fazer o deploy q mantem o banco de dados?

#### O que foi aceito, ajustado ou descartado

- **Aceito:** sugestões para organização de tarefas, estruturação de prompts, documentação e configuração do deploy.
- **Ajustado:** orientações conforme a estrutura do código, os requisitos e os resultados das verificações.
- **Descartado:** alternativas fora do escopo ou que não atendiam às necessidades de hospedagem e persistência do projeto.

## Igor

### ChatGPT

**Ferramenta/modelo:** ChatGPT — GPT-6 e outros modelos utilizados durante o desenvolvimento.

#### Para que utilizei

- **Banco de dados:** apoio na análise e integração do SQLite com as funcionalidades de cadastro, movimentações financeiras e cálculo de saldo.
- **Backend:** esclarecimento sobre arquitetura, organização de rotas, serviços, APIs e comunicação com o banco de dados.
- **Testes:** orientações sobre testes unitários utilizando Vitest e boas práticas para validar funcionalidades.
- **Versionamento:** auxílio na utilização de Git e GitHub, organização de branches, padronização de commits.
- **Organização do projeto:** identificação de tarefas pendentes, divisão de responsabilidades e planejamento das entregas.
- **Melhorias funcionais:** análise da representação de valores monetários e implementação de navegação entre telas.

#### Prompts utilizados — exemplos adaptados

**1. Integração do banco de dados**

> Analise a estrutura do backend do sistema de controle financeiro e explique como integrar o SQLite às funcionalidades de cadastro, movimentações e cálculo de saldo, respeitando a arquitetura existente e garantindo a persistência dos dados.

**2. Tratamento de valores financeiros**

> Avalie a forma como os valores monetários são representados no sistema e proponha uma solução que permita ao usuário informar valores em reais, mantendo a precisão dos cálculos e evitando problemas com números decimais.

**3. Análise das pendências do projeto**

> Analise as funcionalidades existentes no repositório, identifique possíveis pendências relacionadas ao backend e ao banco de dados e organize as próximas etapas necessárias para concluir a integração do sistema.

**4. Versionamento e GitHub**

> Oriente o processo de versionamento das alterações realizadas localmente, incluindo verificação da branch, preparação dos arquivos, criação de commits seguindo boas práticas e envio das modificações ao repositório remoto.

**5. Navegação entre telas**

> Analise a funcionalidade de navegação do sistema e explique como implementar o retorno à tela anterior, preservando o comportamento esperado da interface. Oriente também a classificação da alteração seguindo o padrão Conventional Commits.

**6. Estrutura e funcionamento da API**

> Explique a organização da API no projeto de controle financeiro, identificando as responsabilidades das rotas e dos serviços e como ocorre a comunicação entre frontend, backend e banco de dados.

#### O que foi aceito, ajustado ou descartado

- **Aceito:** orientações sobre integração do SQLite, estruturação do backend, organização das funcionalidades e boas práticas de versionamento.
- **Ajustado:** sugestões sobre representação de valores monetários, considerando a experiência do usuário e a necessidade de manter precisão nos cálculos financeiros.
- **Revisado:** planejamento das atividades de banco de dados, movimentações e cálculo de saldo, considerando as responsabilidades definidas pelo grupo.
- **Descartado:** utilização do GitHub Actions como ferramenta de integração contínua, pois o grupo optou pela utilização do Jenkins.

#### Minha participação

O ChatGPT foi utilizado como ferramenta de apoio técnico e educacional durante o desenvolvimento do sistema de controle financeiro.

Minha principal responsabilidade no projeto está relacionada ao banco de dados e ao backend. Utilizei a IA para compreender a arquitetura existente, avaliar possibilidades de implementação, esclarecer dúvidas técnicas e organizar as atividades sob minha responsabilidade.

As sugestões foram analisadas considerando os requisitos da disciplina e as decisões do grupo. A ferramenta também auxiliou no entendimento dos processos de versionamento e na aplicação de boas práticas de Engenharia de Software.

A utilização da IA teve como objetivo complementar o desenvolvimento, mantendo a responsabilidade pelas decisões técnicas, implementação e validação das funcionalidades.

## Gustavo

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

## José

### Ferramentas e modelos utilizados

- **Codex:** modelo `gpt-6.1-sol`, confirmado nos metadados das conversas consultadas.
- **ChatGPT:** uso informado na solicitação deste registro, mas sem texto original de prompts recuperado nas fontes acessíveis. Modelo não confirmado; não atribuo ao Codex solicitações feitas no ChatGPT.

### Para que utilizei

Utilizei o Codex na conclusão e validação da US05 — Metas Financeiras, na adaptação dos testes à autenticação, na resolução de conflito de integração, em duas refatorações e na implementação de aportes e progresso com interface React. Também houve apoio à documentação técnica e à execução de testes, builds e lint.

Os registros acessíveis são as conversas **“Concluir backend da US05”**, de 12/11/2026, e **“Levantar uso de IA no projeto”**, de 13/11/2026, incluindo o pedido anexado **“Implementar US05 completa — Backend e Frontend”**. Datas e horários abaixo usam America/Sao_Paulo (UTC−3).

**Limite de atribuição:** o Git registra a implementação inicial de metas, com domínio, serviço, criação, listagem, persistência SQLite e testes, integrada pelo PR #30. Não recuperei o prompt dessa etapa; sua autoria assistida por IA não pode ser comprovada apenas pelos commits. Na primeira conversa disponível, a vinculação das metas ao usuário já estava parcialmente implementada localmente. A migração posterior para libSQL/Turso também não deve ser atribuída integralmente a essa conversa.

### Prompts reais — trechos

Os trechos abaixo foram recuperados das mensagens originais; `[...]` indica cortes. Nos dois primeiros pedidos, removi somente as barras de escape de formatação presentes no registro exportado, sem reconstruir o texto ausente.

**1. Conclusão e testes da autenticação das metas — 12/11/2026, 00:32**

**Ferramenta/modelo:** Codex, `gpt-6.1-sol`. **Finalidade:** concluir as alterações locais e validar autenticação, isolamento e preservação dos dados.

> Concluir a parte de backend da US05 — Metas Financeiras, aproveitando as alterações locais já iniciadas.
>
> [...]
>
> O último build apresentou referências antigas a goalCatalog e um erro relacionado à exportação de MetasDoUsuario. Algumas alterações estavam sem salvar. Verifique o estado atual dos arquivos antes de corrigir.
>
> [...]
>
> 3. Garantir que POST /goals e GET /goals exijam autenticação.
> 4. Impedir que um usuário consulte ou altere metas de outro usuário.
> 5. Permitir metas com o mesmo nome para usuários diferentes.
> 6. Garantir que nomes duplicados para o mesmo usuário continuem retornando 409.
> 7. Revisar a migração 6, incluindo preservação de registros existentes, integridade referencial e execução repetida sem efeitos indevidos.
> 8. Atualizar os testes antigos da US05 para a nova arquitetura autenticada.
> 9. Criar testes de integração para ausência de sessão, isolamento entre usuários, duplicidade e persistência após reabrir o SQLite.
>
> [...]
>
> Não invente uma regra financeira. Preserve temporariamente o comportamento atual e indique o que falta decidir para implementar progresso dinâmico.

**Resultado e decisões:** foram criados `backend/tests/integration/goals-auth.test.ts` e `goals-migration.test.ts`, adaptados os testes existentes e atualizado o guia da US05. As mudanças de produção registradas nessa interação foram comentários em `goalRoutes.ts` e `migrarMetasPorUsuario.ts`, além de formatação em `appComBanco.ts`; a integração principal já estava no disco e foi revisada e aproveitada. Os testes novos tiveram o dado de `token_hash` corrigido para respeitar os 64 caracteres exigidos. O conjunto entregue manteve o progresso em zero e o legado com `usuario_id NULL`, sem atribuição arbitrária de proprietário. Build aprovado e 277 testes aprovados após os ajustes. Entrega registrada no commit `3320f81`, integrado pelo PR #44.

**2. Correção do conflito entre metas e resumo financeiro — 12/11/2026, 01:15; continuação às 01:20**

**Ferramenta/modelo:** Codex, `gpt-6.1-sol`. **Finalidade:** resolver uma incompatibilidade real de integração em `backend/src/app.ts`.

> Preciso resolver um conflito de merge no projeto Controle_Financeiro-C14.
>
> [...]
>
> Resolver o conflito preservando integralmente as funcionalidades das duas branches.
>
> [...]
>
> 6. Resolva os marcadores <<<<<<<, ======= e >>>>>>> preservando os dois lados.
> 7. Não substitua todo o app.ts por uma versão antiga.
> 8. Não descarte nem reverta alterações de outros integrantes.

Após salvar a edição não salva do editor em um backup, enviei a continuação:

> Pode continuar a resolução do conflito. Compare o backup, o arquivo atual no disco, HEAD e origin/main.
>
> Preserve a rota /resumo da main e a integração das metas autenticadas da Branch-Jose. Não sobrescreva outras funcionalidades.
>
> Depois execute o build e todos os testes do backend. Se passarem, marque apenas backend/src/app.ts como resolvido com git add.

**Resultado e decisões:** aceitei a resolução que preservou `/resumo`, as metas autenticadas e `pastaFrontend`. O Codex removeu os marcadores e comparou o código compilado com o backup do editor. Build e 279 testes passaram; somente `app.ts` foi marcado como resolvido. O registro comprova essa correção e o `git add`, sem execução de commit ou conclusão do merge pela IA.

**3. Duas refatorações com preservação de comportamento — 13/11/2026, 15:49**

**Ferramenta/modelo:** Codex, `gpt-6.1-sol`. **Finalidade:** identificar problemas reais e realizar as duas refatorações obrigatórias.

> Preciso implementar minhas duas refatorações obrigatórias para a entrega final do projeto Controle_Financeiro-C14.
>
> [...]
>
> 1. Analise a implementação atual do módulo de metas financeiras.
> 2. Identifique dois code smells reais que justifiquem refatorações distintas.
> 3. Implemente duas refatorações efetivas, preferencialmente no módulo de metas.
> 4. Preserve rigorosamente o comportamento existente, as respostas da API, a autenticação e a persistência.
> 5. Mantenha as alterações pequenas, objetivas e fáceis de justificar ao professor.
> 6. Explique claramente o code smell encontrado, a técnica aplicada, o código antes/depois e o motivo de cada alteração.
> 7. Execute os testes unitários e de integração do backend, a cobertura e o build.
> 8. Execute os testes, o lint e o build do frontend para verificar regressões.
>
> [...]
>
> - Não implementar funcionalidades novas durante o refactoring.

**Resultado e decisões:** foram aceitas **Extract Function**, com `goalFromRow()` em `sqlite-goal-repository.ts`, e **Replace Nested Conditional with Guard Clauses**, em `respondError()` de `goalRoutes.ts`. `goals.test.ts` recebeu verificações completas de erros e um cenário adicional de busca/listagem, executados também antes das refatorações. Foram preservados o contrato da API, as mensagens, a autenticação e a persistência. As mudanças ficaram restritas a esses três arquivos, sem antecipar aportes. Commit `b295dfd`, no PR #57: backend de 294 para 295 testes aprovados; frontend manteve 68. Builds, lint e cobertura também foram executados com sucesso.

**4. Aportes, progresso persistente e tela de metas — 13/11/2026, 17:07**

**Ferramenta/modelo:** Codex, `gpt-6.1-sol`. **Finalidade:** substituir o progresso fixo por uma funcionalidade completa, conforme regra mínima explicitamente escolhida no pedido anexado.

> Preciso que você implemente o acompanhamento funcional do progresso das metas financeiras, incluindo backend, frontend, persistência e testes, realizando o mínimo de alterações necessário para entregar uma funcionalidade utilizável de ponta a ponta.
>
> [...]
>
> 3. O usuário pode registrar aportes positivos em suas próprias metas.
> 4. O progresso de cada meta corresponde à soma dos aportes registrados.
> 5. A porcentagem de conclusão é calculada por `valor acumulado / valor-alvo × 100`.
> 6. Os aportes devem persistir no banco de dados.
> 7. Aportes não alteram receitas, despesas nem o saldo geral do usuário.
> 8. Contas diferentes não podem consultar ou modificar metas umas das outras.
> 9. Não implementar retiradas, edição, exclusão ou estornos nesta entrega.
> 10. Permitir que o acumulado ultrapasse o valor-alvo, exibindo o percentual real e limitando apenas a largura visual da barra a 100%.
>
> Essa é a regra escolhida para a implementação mínima. Não alegue que ela já foi formalmente aprovada pela equipe.
>
> [...]
>
> Não aceite identificador de proprietário enviado pelo frontend. Utilize exclusivamente a sessão autenticada.

**Resultado e decisões:** foram produzidos `migrarAportesMetas.ts` (migration 7), o domínio de aportes, o endpoint autenticado `POST /goals/:id/contributions` e o cálculo do acumulado no repositório. No frontend, foram criados `Metas.tsx`, `ServicoDeMetas.ts`, `centavosDeReais.ts` e seus testes, com integração ao menu e à Início. Foram ajustados os testes anteriores para o ID estável e a nova migration. A implementação protege a propriedade e o limite inteiro seguro, inclusive sob concorrência. Aceitei a regra mínima descrita no pedido; retiradas, estornos, edição, exclusão e vínculo com movimentações ficaram fora do escopo. Commit `eb36773`, integrado pelo PR #57. A validação registrada terminou com 329 testes no backend e 102 no frontend, além de cobertura, builds e lint aprovados. Os testes usaram libSQL local; não comprovam execução no Turso remoto ou deploy.

### O que foi aceito, ajustado ou descartado

- **Aceito:** testes e documentação da autenticação, correção do conflito, duas refatorações e implementação funcional de aportes, posteriormente incorporados às entregas. As alterações foram deixadas para minha revisão antes dos commits; os históricos não sustentam atribuir toda a implementação inicial à IA.
- **Ajustado:** testes incompatíveis com a arquitetura autenticada, dados inválidos de sessão, expectativas das migrations e do contrato com ID, além do conflito com `/resumo`. Preservei o trabalho dos colegas ao exigir a comparação entre as versões e fornecer o backup da edição do editor.
- **Decisão humana:** inicialmente determinei manter o progresso em zero; depois escolhi explicitamente a regra mínima de aportes, sem apresentá-la como aprovação formal da equipe.
- **Fora do escopo ou adiado:** retiradas, estornos e integração com movimentações. A investigação preliminar do progresso não gerou implementação enquanto a regra ainda não havia sido definida; não há registro suficiente para listar outras sugestões como efetivamente descartadas.
- **Validação:** os registros contêm execuções de testes automatizados, builds, lint e `git diff --check`. Para as refatorações, o check Jenkins `continuous-integration/jenkins/pr-head` foi registrado como `success` no commit `b295dfd` (PR-57 #1). Essa evidência se refere àquela versão do PR e não comprova deploy nem validação posterior do commit de aportes.

### Resultados verificáveis

- [PR #44 — autenticação e isolamento das metas](https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/44), com o conjunto de alterações do commit `3320f81`.
- [PR #57 — refatorações, aportes e interface](https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14/pull/57), incluindo os commits `b295dfd` e `eb36773`.
- [Documentação da US05](../us05-metas-financeiras.md), com contratos, migrations, regra de progresso e limitações.
- [Testes de integração da autenticação](../../backend/tests/integration/goals-auth.test.ts), [migração das metas](../../backend/tests/integration/goals-migration.test.ts), [API e repositório](../../backend/tests/integration/goals.test.ts) e [aportes](../../backend/tests/integration/goals-contributions.test.ts).
- [Testes unitários de metas](../../backend/tests/unit/goals), [tela React](../../frontend/src/pages/Metas.test.tsx), [serviço HTTP](../../frontend/src/services/ServicoDeMetas.test.ts) e [conversão monetária](../../frontend/src/utils/centavosDeReais.test.ts).
- [Comparação dos testes antes e depois das refatorações e evidência histórica do Jenkins](../../README.md#evidências-dos-refactorings-de-josé). Os resultados citados neste registro são históricos; as suítes não foram reexecutadas nesta edição documental.

