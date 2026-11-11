# Mesma versão do Node usada pelo agente do Jenkins (infra/jenkins/agent/Dockerfile).
FROM node:24.21.0-trixie-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24.21.0-trixie-slim AS backend
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

FROM node:24.21.0-trixie-slim AS dependencias
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# A imagem final leva só o que a aplicação usa para rodar: sem código-fonte,
# dependências de build, testes ou ferramentas de compilação.
FROM node:24.21.0-trixie-slim
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/financeiro.sqlite \
    FRONTEND_DIR=/app/public
WORKDIR /app
COPY --from=dependencias /app/node_modules ./node_modules
COPY --from=backend /build/backend/dist ./dist
COPY --from=frontend /build/frontend/dist ./public
COPY backend/package.json ./

# O usuário node (uid 1000) já existe na imagem base. Um volume novo montado em
# /data herda este dono, então o SQLite e o arquivo de journal podem ser gravados.
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]
