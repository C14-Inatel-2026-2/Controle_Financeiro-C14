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
    description('Constrói a imagem da aplicação no commit aprovado, verifica-a e, chamado pela pipeline completa, publica no Docker Hub.')

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

// Gatilho da produção: consulta a main do GitHub a cada 2 minutos e, quando há commit novo,
// inicia a pipeline-completa com BRANCH=main. Polling, e não webhook: este Jenkins local
// não é acessível pela internet.
// - O SCM é fixo em refs/heads/main. O da pipeline-completa usa ${BRANCH}, e o polling de um
//   Pipeline segue os parâmetros da última execução; por isso o gatilho fica num job próprio.
// - H/2 só verifica a main; sem commit novo, nenhuma execução é criada.
// - O Jenkinsfile deste job não chama properties(), que apagaria o gatilho declarado aqui.
// - A primeira execução, manual ou do polling, só registra a main como referência.
pipelineJob('gatilho-main') {
    description('Consulta a main do GitHub a cada 2 minutos e, quando há commit novo, inicia a pipeline-completa com BRANCH=main. Sem parâmetros: o alvo é sempre a main. Uma execução manual só registra a referência do polling.')

    properties {
        disableConcurrentBuilds()
        pipelineTriggers {
            triggers {
                pollSCM {
                    scmpoll_spec('H/2 * * * *')
                }
            }
        }
    }

    logRotator {
        numToKeep(20)
    }

    definition {
        cpsScm {
            scm {
                git {
                    remote {
                        url('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14.git')
                    }
                    branch('refs/heads/main')
                }
            }
            scriptPath('infra/jenkins/Jenkinsfile.gatilho-main')
            // Checkout completo: registra a main nesta execução, que é o que o polling compara.
            lightweight(false)
        }
    }
}

// Validação de PRs para a main. O Jenkins consulta o GitHub periodicamente:
// não depende de webhook nem expõe este Jenkins local à internet.
multibranchPipelineJob('pr-validacao') {
    description('Valida PRs abertos para a main: mescla com a main no agente, roda builds e testes e publica o status no commit do PR. Não publica imagem nem faz deploy.')

    branchSources {
        branchSource {
            source {
                github {
                    // ID fixo: trocá-lo faria o Jenkins tratar a origem como nova.
                    id('controle-financeiro-prs')
                    repoOwner('C14-Inatel-2026-2')
                    repository('Controle_Financeiro-C14')
                    repositoryUrl('https://github.com/C14-Inatel-2026-2/Controle_Financeiro-C14')
                    configuredByUrl(true)

                    // Token do GitHub cadastrado só no Jenkins (veja docs/jenkins/validacao-pr.md).
                    credentialsId('github-pr-status')

                    traits {
                        // Só PRs de branches deste repositório; branches e forks não são construídos.
                        // strategyId 2 = obter o commit do próprio PR. A mescla com a main é feita
                        // no Jenkinsfile.pr: no modo 1 o plugin lê o Jenkinsfile.pr da ref de mescla
                        // do GitHub, que não existe quando há conflito, e o PR ficava sem status.
                        gitHubPullRequestDiscovery {
                            strategyId(2)
                        }
                    }
                }
            }
        }
    }

    factory {
        workflowBranchProjectFactory {
            scriptPath('Jenkinsfile.pr')
        }
    }

    // Consulta o GitHub a cada 2 minutos.
    triggers {
        periodicFolderTrigger {
            interval('2m')
        }
    }

    // Remove os jobs de PRs fechados na consulta seguinte.
    orphanedItemStrategy {
        discardOldItems {
            numToKeep(0)
        }
    }
}
