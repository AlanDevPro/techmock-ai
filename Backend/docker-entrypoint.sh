#!/usr/bin/env bash
# =====================================================================
# docker-entrypoint.sh
# Punto de entrada del contenedor Docker para producción.
#
# Flujo:
#   1. Esperar a que RDS esté disponible (TCP check)
#   2. Ejecutar migraciones pendientes
#   3. Iniciar la API Node.js
# =====================================================================

set -euo pipefail

# ── Colores para logs ─────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[entrypoint]${NC} $*"; }
warn() { echo -e "${YELLOW}[entrypoint]${NC} $*"; }
fail() { echo -e "${RED}[entrypoint]${NC} $*"; exit 1; }

# ── Paso 1: Esperar a RDS ─────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
MAX_RETRIES=30
RETRY_INTERVAL=3

log "Esperando conexión a RDS en $DB_HOST:$DB_PORT ..."

for i in $(seq 1 $MAX_RETRIES); do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "${DB_USER:-postgres}" -q 2>/dev/null; then
        log "✅ RDS disponible después de $i intento(s)."
        break
    fi

    if [[ "$i" -eq "$MAX_RETRIES" ]]; then
        fail "❌ No se pudo conectar a RDS después de $MAX_RETRIES intentos. Abortando."
    fi

    warn "   RDS no disponible aún (intento $i/$MAX_RETRIES). Reintentando en ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
done

# ── Paso 2: Ejecutar migraciones ──────────────────────────────────────
log "Ejecutando migraciones pendientes..."

MIGRATIONS_SCRIPT="/app/migrations/000_run_all_migrations.sh"

if [[ ! -f "$MIGRATIONS_SCRIPT" ]]; then
    fail "❌ Script de migraciones no encontrado: $MIGRATIONS_SCRIPT"
fi

bash "$MIGRATIONS_SCRIPT"

log "✅ Migraciones completadas."

# ── Paso 3: Iniciar la API ────────────────────────────────────────────
log "Iniciando API Node.js..."
exec node src/app.js