# 🐳 TechMock AI — Docker Setup

## Estructura de archivos Docker

```
Backend/
├── src/                          ← Tu código (sin cambios)
├── docker/
│   └── postgres/
│       └── init.sql              ← Script SQL maestro (se ejecuta solo 1 vez)
├── .dockerignore                 ← Excluye archivos del build
├── .env.docker                   ← Variables para Docker (NO subir a Git)
├── Dockerfile                    ← Multi-stage: deps / dev-deps / runner
├── docker-compose.yml            ← Servicios base (postgres, api, pgadmin)
├── docker-compose.dev.yml        ← Override desarrollo (hot reload)
├── docker-compose.prod.yml       ← Override producción (optimizado)
└── Makefile                      ← Shortcuts de comandos
```

---

## Paso a paso: Primera vez

### 1. Copiar y configurar el archivo de entorno

```bash
cp .env.docker .env.docker.local   # opcional, para tener uno local
```

Editar `.env.docker` y reemplazar los valores sensibles:
- `POSTGRES_PASSWORD` — cambia por una contraseña segura
- `JWT_SECRET` — mínimo 32 caracteres aleatorios
- `FIREBASE_PRIVATE_KEY` — tu clave real de Firebase
- `ANTHROPIC_API_KEY` — tu API key de Anthropic
- `SMTP_PASS` — tu App Password de Gmail

### 2. Crear carpeta de backups

```bash
mkdir backups
```

### 3. Levantar en desarrollo (con hot reload)

```bash
# Opción A — con Make (recomendado)
make dev-up

# Opción B — manualmente
docker compose --env-file .env.docker \
               -f docker-compose.yml  \
               -f docker-compose.dev.yml \
               up --build
```

### 4. Verificar que todo funciona

```bash
# Health check de la API
curl http://localhost:4000/health

# Ver logs en vivo
make dev-logs

# Ver estado de contenedores
make ps
```

### 5. Acceder a pgAdmin (GUI de la base de datos)

- URL: http://localhost:5050
- Email: `admin@techmock.dev`
- Password: `admin123`

Agregar servidor en pgAdmin:
- Host: `postgres`  ← nombre del contenedor, NO localhost
- Port: `5432`
- Database: `sistema_entrevistas`
- Username: `techmock_user`

---

## Comandos del día a día

| Comando | Descripción |
|---|---|
| `make dev-up` | Levantar en dev con logs |
| `make dev-up-d` | Levantar en dev en background |
| `make dev-down` | Detener todos los servicios |
| `make dev-logs` | Ver logs de la API en vivo |
| `make dev-restart` | Reiniciar solo la API |
| `make db-shell` | Abrir psql dentro del contenedor |
| `make db-backup` | Crear backup de la BD |
| `make health` | Verificar health de la API |
| `make clean` | ⚠️ Borrar todo + volúmenes |

---

## Producción

```bash
make prod-up
```

En producción:
- El puerto de PostgreSQL NO se expone al host (solo acceso interno)
- pgAdmin está deshabilitado
- La imagen usa el stage `runner` (sin devDependencies)
- Los contenedores se reinician automáticamente (`restart: always`)

---

## Importante: La base de datos y `init.sql`

El script `docker/postgres/init.sql` **solo se ejecuta una vez**, la primera
vez que se crea el volumen `postgres_data`.

Si necesitas **resetear la BD completamente**:

```bash
make clean          # borra contenedores + volúmenes
make dev-up         # recrea todo desde cero con el init.sql
```

Si necesitas **agregar tablas o datos** sin resetear, conéctate con:

```bash
make db-shell
```

---

## Troubleshooting

**Error: "relation already exists"** → El volumen ya existe con la BD creada.
El `init.sql` no se ejecuta de nuevo. Usa `make db-shell` para ejecutar SQL manualmente.

**La API no conecta a la BD** → Verifica que `DATABASE_URL` en `.env.docker`
use `@postgres:5432` (nombre del servicio), no `@localhost`.

**Puerto 5432 ocupado** → El `.env.docker` usa `POSTGRES_PORT=5433` para
mapear al host en dev. Tu postgres local sigue en 5432; el de Docker en 5433.