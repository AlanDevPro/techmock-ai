#!/usr/bin/env bash
# =====================================================================
# SCRIPT MAESTRO DE MIGRACIÓN → AWS RDS (PostgreSQL)
# Versión profesional con control de migraciones ejecutadas.
#
# Solo ejecuta archivos .sql que NO hayan sido registrados previamente
# en la tabla schema_migrations. Es idempotente: puedes correrlo
# N veces sin efectos secundarios.
#
# USO DIRECTO:
#   export DB_HOST=interview-db.c25yiaig4xp3.us-east-1.rds.amazonaws.com
#   export DB_PORT=5432
#   export DB_NAME=sistema_entrevistas
#   export DB_USER=postgres
#   export PGPASSWORD=alandevpro67656434
#   ./000_run_all_migrations.sh
#
# En Docker el entrypoint pasa estas variables automáticamente desde .env.prod
# =====================================================================

set -euo pipefail

# ── Configuración ─────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-sistema_entrevistas}"
DB_USER="${DB_USER:-postgres}"
# PGPASSWORD es leída automáticamente por psql desde el entorno

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Helper: ejecutar SQL contra RDS ──────────────────────────────────
run_sql() {
    psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 \
        --quiet \
        "$@"
}

echo "======================================================="
echo "  TechMock AI — Migración automática a AWS RDS"
echo "  Host : $DB_HOST:$DB_PORT"
echo "  DB   : $DB_NAME"
echo "  User : $DB_USER"
echo "======================================================="
echo ""

# ── Paso 1: Crear tabla de control (si no existe) ─────────────────────
echo "▶  Inicializando tabla de control schema_migrations..."
run_sql -f "$SCRIPT_DIR/000_schema_migrations.sql"
echo "   ✅ Tabla de control lista."
echo ""

# ── Paso 2: Lista ordenada de migraciones (excluye el propio script) ──
MIGRATIONS=(
    "001_empresa.sql"
    "002_usuarios.sql"
    "003_tecnologias.sql"
    "004_niveles_dificultad.sql"
    "005_preguntas.sql"
    "006_rubricas.sql"
    "007_sesiones_entrevista.sql"
    "008_mensajes.sql"
    "009_envios_codigo.sql"
    "010_ejecuciones_ide.sql"
    "011_evaluaciones.sql"
    "012_detalle_evaluacion.sql"
    "013_estadisticas_usuario.sql"
    "014_contactos_reclutamiento.sql"
    "015_notificaciones.sql"
    "016_refresh_tokens.sql"
    "017_categorias_error.sql"
    "018_errores_detectados.sql"
    "019_recomendaciones_solucion.sql"
    "020_perfil_tecnico_usuario.sql"
    "021_fortalezas_debilidades_usuario.sql"
    "022_vista_candidatos_reclutador.sql"
)

TOTAL=${#MIGRATIONS[@]}
EXECUTED=0
SKIPPED=0

echo "  Revisando $TOTAL migraciones..."
echo ""

for FILE in "${MIGRATIONS[@]}"; do
    PATH_FILE="$SCRIPT_DIR/$FILE"

    # Verificar que el archivo existe en el contenedor
    if [[ ! -f "$PATH_FILE" ]]; then
        echo "❌  ARCHIVO NO ENCONTRADO: $FILE"
        echo "    Ruta esperada: $PATH_FILE"
        exit 1
    fi

    # Consultar si ya fue ejecutada
    ALREADY_RUN=$(run_sql -tAc \
        "SELECT COUNT(*) FROM schema_migrations WHERE filename='$FILE';")

    if [[ "$ALREADY_RUN" -gt 0 ]]; then
        echo "   ⏭  $FILE (ya ejecutada — omitida)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    # Ejecutar migración
    echo -n "▶  $FILE ... "
    run_sql -f "$PATH_FILE"

    # Registrar como ejecutada
    run_sql -c "INSERT INTO schema_migrations (filename) VALUES ('$FILE');"

    echo "✅"
    EXECUTED=$((EXECUTED + 1))
done

echo ""
echo "======================================================="
echo "  Resumen de migraciones"
echo "  ✅ Ejecutadas  : $EXECUTED"
echo "  ⏭  Omitidas    : $SKIPPED"
echo "  📦 Total       : $TOTAL"
echo "======================================================="