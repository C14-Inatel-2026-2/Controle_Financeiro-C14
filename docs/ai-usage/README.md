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

<!-- Inserir o registro do integrante seguindo a mesma estrutura. -->

