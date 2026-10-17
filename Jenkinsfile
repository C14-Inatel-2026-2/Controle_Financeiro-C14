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
            description: 'Branch publicada no GitHub, sem origin/. Repassada aos cinco jobs.'
        )
    ]),

    // Duas execuções simultâneas disputariam o mesmo agente e a mesma pasta de deploy.
    disableConcurrentBuilds(),

    // Limita o histórico armazenado neste Jenkins local.
    buildDiscarder(logRotator(numToKeepStr: '10'))
])

def branch = params.BRANCH

// Os cinco jobs disputam o único executor do agente, então o limite cobre a fila inteira.
timeout(time: 60, unit: 'MINUTES') {

    stage('Build') {
        parallel(
            'Frontend': {
                build job: 'frontend-build',
                      parameters: [string(name: 'BRANCH', value: branch)]
            },
            'Backend': {
                build job: 'backend-build',
                      parameters: [string(name: 'BRANCH', value: branch)]
            }
        )
    }

    stage('Testes') {
        parallel(
            'Unitários': {
                build job: 'backend-unit-igor',
                      parameters: [string(name: 'BRANCH', value: branch)]
            },
            'Integração e cobertura': {
                build job: 'backend-integration-coverage',
                      parameters: [string(name: 'BRANCH', value: branch)]
            }
        )
    }

    // Só chega aqui se o build e os testes passaram: o build step propaga a
    // falha por padrão, interrompendo a pipeline antes de publicar qualquer coisa.
    stage('Deploy') {
        build job: 'backend-deploy',
              parameters: [string(name: 'BRANCH', value: branch)]
    }
}
