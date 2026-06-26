# ============================================================
# STAGE 1: deps — dependencias de producción
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force


# ============================================================
# STAGE 2: dev-deps — desarrollo
# ============================================================
FROM node:20-alpine AS dev-deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci && npm cache clean --force


# ============================================================
# STAGE 3: runner — producción
# ============================================================
FROM node:20-alpine AS runner

LABEL maintainer="TechMock AI Team"
LABEL version="1.0.0"
LABEL description="TechMock AI Backend API"

ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

# Dependencias del sistema
RUN apk add --no-cache \
    dumb-init \
    wget \
    postgresql-client \
    bash

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Dependencias Node
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Código fuente
COPY --chown=nodeuser:nodejs . .

# Migraciones SQL
COPY --chown=nodeuser:nodejs src/database/migrations ./migrations

# Entrypoint
COPY --chown=nodeuser:nodejs docker-entrypoint.sh ./docker-entrypoint.sh

# Permisos
RUN chmod +x ./docker-entrypoint.sh && \
    chmod +x ./migrations/000_run_all_migrations.sh

# Logs
RUN mkdir -p /app/logs && \
    chown -R nodeuser:nodejs /app/logs

USER nodeuser

EXPOSE 4000

# Healthcheck
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=30s \
            --retries=3 \
CMD wget -qO- http://localhost:4000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]

# Ejecuta migraciones y luego arranca Node
CMD ["./docker-entrypoint.sh"]