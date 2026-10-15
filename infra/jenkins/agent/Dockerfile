# Usa uma versão explícita do Node como origem dos executáveis e do npm.
# A variante Debian evita misturar bibliotecas de distribuições incompatíveis.
FROM node:24.21.0-trixie-slim AS node

# Esta imagem fornece Java, Git e o programa de conexão com o controlador.
FROM jenkins/inbound-agent:3391.va_37fa_a_305d6d-5-jdk21

# Privilégios administrativos são usados apenas na preparação da imagem.
USER root

# O Node pode precisar desta biblioteca em arquiteturas como ARM.
# A limpeza remove somente os índices de pacotes armazenados na imagem.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# Copia somente o Node e o npm, sem trazer outros gerenciadores de pacotes.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm

# Disponibiliza os comandos npm e npx no PATH, apontando para seus programas.
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

# Os builds não devem executar como administrador do contêiner.
USER jenkins

# Interrompe a construção caso alguma ferramenta necessária não funcione.
RUN node --version \
    && npm --version \
    && git --version \
    && java -version