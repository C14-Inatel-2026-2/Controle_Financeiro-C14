// Confirma que o workspace está na revisão pedida ao job.
// Os cinco Jenkinsfiles carregam este arquivo logo após o checkout scm.
//
// O Job DSL usa GIT_COMMIT_SHA como revisão do SCM, tanto para carregar o
// Jenkinsfile quanto para o checkout scm. Ele chega de duas formas:
// - pela pipeline completa: o SHA completo resolvido no início dela, que o
//   HEAD precisa reproduzir exatamente;
// - pela execução manual: o valor padrão refs/heads/${BRANCH}, que o plugin
//   Git resolve para a ponta da branch, como antes.

def solicitado = params.GIT_COMMIT_SHA
def head = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()

if (solicitado ==~ /[0-9a-f]{40}/) {
    if (head != solicitado) {
        error "O HEAD obtido (${head}) difere do GIT_COMMIT_SHA solicitado (${solicitado})."
    }
    echo "Revisão confirmada: HEAD ${head} é o GIT_COMMIT_SHA solicitado (branch ${params.BRANCH})."
} else if (solicitado == null || solicitado == 'refs/heads/${BRANCH}') {
    // Sem esta verificação, um job que ainda não declara GIT_COMMIT_SHA
    // descartaria o valor enviado pela pipeline e executaria a ponta da branch.
    if (currentBuild.getBuildCauses('hudson.model.Cause$UpstreamCause')) {
        error 'Job chamado por outro job sem um GIT_COMMIT_SHA válido; reaplique o Job DSL antes de usar a pipeline completa.'
    }
    echo "Execução manual sem SHA: HEAD ${head} é a ponta de ${params.BRANCH}."
} else {
    error "GIT_COMMIT_SHA inválido: '${solicitado}'. Informe o SHA completo, com 40 caracteres hexadecimais minúsculos, ou mantenha refs/heads/\${BRANCH}."
}
