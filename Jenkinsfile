// Pipeline completa: encadeia os cinco jobs do projeto.
//
// Este arquivo é um pipeline "scripted" (sem o bloco pipeline { }) de propósito.
// O agente tem um único executor: se o orquestrador fosse declarativo, o agent
// dele ocuparia esse executor e os jobs chamados ficariam presos na fila,
// esperando um executor que só seria liberado quando eles terminassem.
// Sem o bloco node { }, este pipeline roda no controlador e apenas aguarda.

properties([
    // Os parâmetros são repetidos aqui porque um properties() sem eles
    // apagaria os que o Job DSL declarou para este job.
    parameters([
        string(
            name: 'BRANCH',
            defaultValue: 'main',
            description: 'Branch publicada no GitHub, sem origin/. Sua ponta no início da execução é o commit repassado aos cinco jobs.'
        )
    ]),

    // Duas execuções simultâneas disputariam o mesmo agente e a mesma publicação da imagem.
    disableConcurrentBuilds(),

    // Limita o histórico armazenado neste Jenkins local.
    buildDiscarder(logRotator(numToKeepStr: '10'))
])

def branch = params.BRANCH ?: ''
def branchRef = "refs/heads/${branch}".toString()
def commit
// Digest confirmado pelo backend-deploy; é a imagem pedida ao Render.
def digestPublicado

// Validado antes de chegar ao shell.
if (!(branch ==~ /[A-Za-z0-9._\/-]+/)) {
    error "BRANCH inválida: '${branch}'."
}

// Os cinco jobs disputam o único executor do agente, então o limite cobre a fila inteira.
timeout(time: 60, unit: 'MINUTES') {

    // Resolve a ponta da branch uma única vez. Os cinco jobs recebem este SHA e
    // carregam o Jenkinsfile e o código dele, mesmo que haja push durante a execução.
    stage('Resolver commit') {
        // O controlador não tem executores e o shell exige um. O bloco node
        // termina antes dos builds, liberando o único executor para os jobs.
        node('node24') {
            def saida = withEnv([
                'REPO_URL=https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git',
                "BRANCH_REF=${branchRef}"
            ]) {
                // --exit-code faz o comando falhar quando a branch não existe.
                sh(script: 'git ls-remote --exit-code "$REPO_URL" "$BRANCH_REF"', returnStdout: true).trim()
            }

            def linhas = saida.tokenize('\n')
            def campos = linhas.size() == 1 ? linhas[0].tokenize('\t') : []

            if (campos.size() != 2 || campos[1] != branchRef || !(campos[0] ==~ /[0-9a-f]{40}/)) {
                error "Não foi possível resolver um único SHA para ${branchRef}. Saída do git ls-remote:\n${saida}"
            }

            commit = campos[0]
        }

        echo "Commit escolhido: ${commit} (ponta de ${branch} no início da pipeline)."
        currentBuild.description = "${branch} @ ${commit.substring(0, 8)}"
    }

    def parametros = [
        string(name: 'BRANCH', value: branch),
        string(name: 'GIT_COMMIT_SHA', value: commit)
    ]

    stage('Build') {
        parallel(
            'Frontend': {
                build job: 'frontend-build',
                      parameters: parametros
            },
            'Backend': {
                build job: 'backend-build',
                      parameters: parametros
            }
        )
    }

    stage('Testes') {
        parallel(
            'Unitários': {
                build job: 'backend-unit-igor',
                      parameters: parametros
            },
            'Integração e cobertura': {
                build job: 'backend-integration-coverage',
                      parameters: parametros
            }
        )
    }

    // Só chega aqui se o build e os testes passaram: o build step propaga a
    // falha por padrão, interrompendo a pipeline antes de publicar qualquer coisa.
    // O backend-deploy constrói a imagem com este mesmo SHA e a publica no Docker Hub.
    stage('Deploy') {
        def deploy = build job: 'backend-deploy',
                           parameters: parametros

        // Conferência independente da detecção feita no backend-deploy: a descrição
        // dele só traz referência e digest quando imagem-publicada.txt foi gerado.
        def descricao = deploy.description ?: ''
        if (!(descricao ==~ /referencia=\S+:${commit} \| digest=\S+@sha256:[0-9a-f]{64} \| latest=(true|false)/)) {
            error "backend-deploy #${deploy.number} terminou sem comprovar a publicação de ${commit}. Descrição: '${descricao}'"
        }
        echo "Imagem publicada: ${descricao}"
        digestPublicado = descricao.tokenize('|')*.trim().find { it.startsWith('digest=') }.substring('digest='.length())
    }

    // Produção: só a main pede ao Render o deploy da imagem exata comprovada acima.
    // Outras branches publicam a imagem do SHA, mas não mexem no site. O backend-deploy
    // executado sozinho não chega aqui. disableConcurrentBuilds() serializa as execuções,
    // e a ponta da main é conferida de novo logo antes do pedido: uma execução atrasada
    // nunca pede uma versão mais antiga do que a ponta atual.
    stage('Atualizar Render') {
        if (branch != 'main') {
            echo "Render não atualizado: só a main publica no site (BRANCH=${branch})."
            return
        }
        node('node24') {
            // O mesmo commit que carregou este Jenkinsfile; traz o script do pedido.
            deleteDir()
            checkout scm
            timeout(time: 2, unit: 'MINUTES') {
                withEnv([
                    'REPO_URL=https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git',
                    "COMMIT_APROVADO=${commit}",
                    "IMAGEM_DIGEST=${digestPublicado}"
                ]) {
                    withCredentials([string(credentialsId: 'render-deploy-hook', variable: 'RENDER_DEPLOY_HOOK')]) {
                        // Aspas simples: o Groovy não interpola o segredo; o shell só o repassa ao Node
                        // pelo ambiente. Status 10 = ignorado porque a main avançou.
                        def status = sh(returnStatus: true, script: '''
                            set -eu
                            PONTA=$(git ls-remote --exit-code "$REPO_URL" refs/heads/main | cut -f1)
                            if [ "$PONTA" != "$COMMIT_APROVADO" ]; then
                                printf 'situacao=ignorado\\nimagem=%s\\nmotivo=a main avançou para %s\\n' "$IMAGEM_DIGEST" "$PONTA" > deploy-render.txt
                                echo "Deploy no Render ignorado: a main avançou de $COMMIT_APROVADO para $PONTA. Execute a pipeline-completa da main de novo."
                                exit 10
                            fi
                            node infra/jenkins/solicitar-deploy-render.js
                        ''')
                        archiveArtifacts(artifacts: 'deploy-render.txt', allowEmptyArchive: true)
                        def registro = fileExists('deploy-render.txt') ? readFile('deploy-render.txt').trim().replace('\n', ' | ') : ''
                        if (status == 10) {
                            currentBuild.description += ' | Render: ignorado (main avançou)'
                        } else if (status != 0) {
                            currentBuild.description += ' | Render: falhou'
                            error "A imagem foi publicada, mas o deploy no Render não foi aceito. ${registro}"
                        } else {
                            currentBuild.description += ' | Render: solicitado (confira se ficou Live)'
                            echo "Deploy solicitado ao Render, ainda não confirmado como Live: ${registro}"
                        }
                    }
                }
            }
        }
    }
}
