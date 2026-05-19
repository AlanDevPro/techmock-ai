# ============================================================
# STAGE 1: deps — dependencias de producción
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Instalar dependencias del sistema necesarias para algunas libs nativas
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./

# Instalar SOLO dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force


# ============================================================
# STAGE 2: dev-deps — dependencias completas para desarrollo
# ============================================================
FROM node:20-alpine AS dev-deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./

# Instalar TODO (incluye typescript, eslint, tailwind, etc.)
RUN npm ci && npm cache clean --force


# ============================================================
# STAGE 3: builder — compila la app Next.js para producción
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copiar deps completas para poder compilar
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno necesarias en BUILD TIME
# (Next.js las incrusta en el bundle con NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# Deshabilitar telemetría de Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build de producción — genera .next/standalone
RUN npm run build


# ============================================================
# STAGE 4: runner — imagen final mínima de producción
# ============================================================
FROM node:20-alpine AS runner

LABEL maintainer="TechMock AI Team"
LABEL version="1.0.0"
LABEL description="TechMock AI Frontend — Next.js 16"

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

WORKDIR /app

# Usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nextuser -u 1001 -G nodejs

# Copiar artefactos del build
COPY --from=builder --chown=nextuser:nodejs /app/public ./public
COPY --from=builder --chown=nextuser:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextuser:nodejs /app/.next/static ./.next/static

USER nextuser

EXPOSE 3000

# Health check interno
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Next.js standalone no necesita "npm start"
CMD ["node", "server.js"]