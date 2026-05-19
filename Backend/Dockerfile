# ============================================================
# STAGE 1: deps — solo dependencias de producción
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package.json package-lock.json ./

# Instalar SOLO deps de producción (sin devDependencies)
RUN npm ci --omit=dev && npm cache clean --force


# ============================================================
# STAGE 2: dev-deps — dependencias completas para desarrollo
# ============================================================
FROM node:20-alpine AS dev-deps

WORKDIR /app

COPY package.json package-lock.json ./

# Instalar TODO (incluye nodemon, jest, supertest)
RUN npm ci && npm cache clean --force


# ============================================================
# STAGE 3: runner — imagen final de producción
# ============================================================
FROM node:20-alpine AS runner

# Metadatos de la imagen
LABEL maintainer="TechMock AI Team"
LABEL version="1.0.0"
LABEL description="TechMock AI Backend API"

# Variables de entorno base (sin secretos — se inyectan vía docker-compose)
ENV NODE_ENV=production \
    PORT=4000

WORKDIR /app

# Usuario no-root por seguridad (best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeuser -u 1001 -G nodejs

# Copiar deps de producción desde stage 1
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copiar código fuente
COPY --chown=nodeuser:nodejs . .

# Cambiar al usuario no-root
USER nodeuser

# Puerto expuesto
EXPOSE 4000

# Health check interno del contenedor
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Comando de inicio en producción
CMD ["node", "src/app.js"]