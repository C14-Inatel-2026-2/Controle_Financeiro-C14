pipelineJob('frontend-build') {
    description('Build manual do frontend para uma branch informada na execução.')

    parameters {
        stringParam(
            'BRANCH',
            'Branch-Gustavo',
            'Nome exato da branch publicada no GitHub, sem origin/. Exemplo: main.'
        )
        stringParam(
            'GIT_COMMIT_SHA',
            'refs/heads/${BRANCH}',
            'SHA completo do commit a executar, preenchido pela pipeline completa. Na execução manual, mantenha refs/heads/${BRANCH} para usar a ponta de BRANCH.'
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
                    // O plugin Git expande o valor duas vezes: um SHA completo
                    // fixa o commit e o padrão refs/heads/${BRANCH} vira a
                    // ponta da branch. Vale para o Jenkinsfile e o checkout scm.
                    branch('${GIT_COMMIT_SHA}')
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
        stringParam(
            'GIT_COMMIT_SHA',
            'refs/heads/${BRANCH}',
            'SHA completo do commit a executar, preenchido pela pipeline completa. Na execução manual, mantenha refs/heads/${BRANCH} para usar a ponta de BRANCH.'
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
                    // O plugin Git expande o valor duas vezes: um SHA completo
                    // fixa o commit e o padrão refs/heads/${BRANCH} vira a
                    // ponta da branch. Vale para o Jenkinsfile e o checkout scm.
                    branch('${GIT_COMMIT_SHA}')
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
        stringParam(
            'GIT_COMMIT_SHA',
            'refs/heads/${BRANCH}',
            'SHA completo do commit a executar, preenchido pela pipeline completa. Na execução manual, mantenha refs/heads/${BRANCH} para usar a ponta de BRANCH.'
        )
    }

    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git')
                    }
                    branch('${GIT_COMMIT_SHA}')
                }
            }
            scriptPath('backend/Jenkinsfile')
            lightweight(false)
        }
    }
}

pipelineJob('backend-deploy') {
    description('Publica o backend aprovado numa pasta local do agente e reinicia a aplicação, preservando o SQLite.')

    parameters {
        stringParam('BRANCH', 'Branch-Donatto', 'Branch publicada no GitHub, sem origin/.')
        stringParam(
            'GIT_COMMIT_SHA',
            'refs/heads/${BRANCH}',
            'SHA completo do commit a executar, preenchido pela pipeline completa. Na execução manual, mantenha refs/heads/${BRANCH} para usar a ponta de BRANCH.'
        )
    }

    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git')
                    }
                    branch('${GIT_COMMIT_SHA}')
                }
            }
            scriptPath('backend/Jenkinsfile.deploy')
            lightweight(false)
        }
    }
}

pipelineJob('backend-unit-igor') {
    description('Testes unitários do backend com relatório JUnit para a branch informada.')
    parameters {
        stringParam('BRANCH', 'Branch-Igor', 'Nome exato da branch publicada no GitHub, sem origin/.')
        stringParam(
            'GIT_COMMIT_SHA',
            'refs/heads/${BRANCH}',
            'SHA completo do commit a executar, preenchido pela pipeline completa. Na execução manual, mantenha refs/heads/${BRANCH} para usar a ponta de BRANCH.'
        )
    }
    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git')
                    }
                    branch('${GIT_COMMIT_SHA}')
                }
            }
            scriptPath('backend/Jenkinsfile.unit')
            lightweight(false)
        }
    }
}

pipelineJob('pipeline-completa') {
    description('Executa os cinco jobs do projeto: builds, testes e deploy, nessa ordem.')

    parameters {
        stringParam('BRANCH', 'main', 'Branch publicada no GitHub, sem origin/.')
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
            scriptPath('Jenkinsfile')
            lightweight(false)
        }
    }
}
