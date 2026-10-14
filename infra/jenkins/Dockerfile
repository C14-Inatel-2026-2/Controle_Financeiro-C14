# A versão explícita evita atualizar o Jenkins implicitamente ao reconstruir a imagem.
FROM jenkins/jenkins:2.580.1-jdk21

# Mantém a lista sob propriedade do usuário não privilegiado que executa o Jenkins.
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt

# A lista fixa também as dependências; --latest=false evita selecionar suas
# versões mais recentes automaticamente durante a construção da imagem.
RUN jenkins-plugin-cli \
    --plugin-file /usr/share/jenkins/ref/plugins.txt \
    --latest=false

# Copia o YAML para fora de /var/jenkins_home, que é coberto pelo volume de dados.
# Assim, o volume não oculta a configuração fornecida por esta versão da imagem.
# Esta etapa vem após os plugins para reaproveitar seu cache quando só o YAML muda.
COPY --chown=jenkins:jenkins jenkins.yaml /usr/share/jenkins/casc/jenkins.yaml
# Inclui a definição dos jobs fora do volume persistente, para que a
# configuração utilizada acompanhe a versão construída da imagem.
COPY --chown=jenkins:jenkins jobs.groovy /usr/share/jenkins/job-dsl/jobs.groovy

# Informa ao JCasC qual arquivo aplicar na inicialização do Jenkins.
ENV CASC_JENKINS_CONFIG=/usr/share/jenkins/casc/jenkins.yaml
