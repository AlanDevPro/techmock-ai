# ============================================================
# Makefile — Shortcuts para Docker TechMock AI
# Uso: make <comando>
# ============================================================

ENV_FILE=--env-file .env.docker
BASE=-f docker-compose.yml
DEV=$(BASE) -f docker-compose.dev.yml
PROD=$(BASE) -f docker-compose.prod.yml

# ── DESARROLLO ───────────────────────────────────────────────

dev-up:
	docker compose $(ENV_FILE) $(DEV) up --build

dev-up-d:
	docker compose $(ENV_FILE) $(DEV) up --build -d

dev-down:
	docker compose $(ENV_FILE) $(DEV) down

dev-logs:
	docker compose $(ENV_FILE) $(DEV) logs -f api

dev-restart:
	docker compose $(ENV_FILE) $(DEV) restart api

# ── PRODUCCIÓN ───────────────────────────────────────────────

prod-up:
	docker compose $(ENV_FILE) $(PROD) up --build -d

prod-down:
	docker compose $(ENV_FILE) $(PROD) down

prod-logs:
	docker compose $(ENV_FILE) $(PROD) logs -f

# ── BASE DE DATOS ────────────────────────────────────────────

db-shell:
	docker exec -it techmock_postgres psql -U $$(grep POSTGRES_USER .env.docker | cut -d= -f2) -d $$(grep POSTGRES_DB .env.docker | cut -d= -f2)

db-backup:
	docker exec techmock_postgres pg_dump \
	  -U $$(grep POSTGRES_USER .env.docker | cut -d= -f2) \
	  $$(grep POSTGRES_DB .env.docker | cut -d= -f2) \
	  > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup guardado en backups/"

db-restore:
	@echo "Uso: make db-restore FILE=backups/tu_backup.sql"
	docker exec -i techmock_postgres psql \
	  -U $$(grep POSTGRES_USER .env.docker | cut -d= -f2) \
	  $$(grep POSTGRES_DB .env.docker | cut -d= -f2) < $(FILE)

# ── UTILIDADES ───────────────────────────────────────────────

ps:
	docker compose $(ENV_FILE) $(DEV) ps

api-shell:
	docker exec -it techmock_api sh

clean:
	docker compose $(ENV_FILE) $(BASE) down -v --remove-orphans
	@echo "⚠️  Volúmenes eliminados — la BD fue borrada"

health:
	@curl -s http://localhost:4000/health | python3 -m json.tool

.PHONY: dev-up dev-up-d dev-down dev-logs dev-restart \
        prod-up prod-down prod-logs \
        db-shell db-backup db-restore \
        ps api-shell clean health