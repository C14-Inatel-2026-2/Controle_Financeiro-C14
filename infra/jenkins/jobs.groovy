pipelineJob('frontend-build') {
    description('Build manual do frontend para uma branch informada na execução.')

    parameters {
        stringParam(
            'BRANCH',
            'Branch-Gustavo',
            'Nome exato da branch publicada no GitHub, sem origin/. Exemplo: main.'
        )
    }

    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git')
                    }

                    // As aspas simples preservam o parâmetro para sua
                    // substituição pelo Jenkins no momento da execução.
                    branch('refs/heads/${BRANCH}')
                }
            }

            scriptPath('frontend/Jenkinsfile')

            // O checkout leve não substitui parâmetros na configuração SCM.
            // O checkout completo permite usar a branch informada na execução.
            lightweight(false)
        }
    }
}

pipelineJob('backend-integration-coverage') {
    description('Testes de integração e cobertura completa do backend para uma branch informada na execução.')

    parameters {
        stringParam(
            'BRANCH',
            'Branch-Caio',
            'Nome exato da branch publicada no GitHub, sem origin/. Exemplo: main.'
        )
    }

    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git')
                    }

                    // As aspas simples preservam o parâmetro para sua
                    // substituição pelo Jenkins no momento da execução.
                    branch('refs/heads/${BRANCH}')
                }
            }

            scriptPath('backend/Jenkinsfile.integration')

            // O checkout leve não substitui parâmetros na configuração SCM.
            // O checkout completo permite usar a branch informada na execução.
            lightweight(false)
        }
    }
}
pipelineJob('backend-build') {
    description('Compila o backend e arquiva os arquivos para deploy.')

    parameters {
        stringParam('BRANCH', 'Branch-Jose', 'Branch publicada no GitHub, sem origin/.')
    }

    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git')
                    }
                    branch('refs/heads/${BRANCH}')
                }
            }
            scriptPath('backend/Jenkinsfile')
            lightweight(false)
        }
    }
}
