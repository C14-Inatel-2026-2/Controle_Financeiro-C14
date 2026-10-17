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

    // Duas execuções simultâneas disputariam o mesmo agente e a mesma pasta de deploy.
    disableConcurrentBuilds(),

    // Limita o histórico armazenado neste Jenkins local.
    buildDiscarder(logRotator(numToKeepStr: '10'))
])

def branch = params.BRANCH ?: ''
def branchRef = "refs/heads/${branch}".toString()
def commit

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
    stage('Deploy') {
        build job: 'backend-deploy',
              parameters: parametros
    }
}
