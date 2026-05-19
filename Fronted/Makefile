# ============================================================
# Makefile — Shortcuts Docker Frontend TechMock AI
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
	docker compose $(ENV_FILE) $(DEV) logs -f frontend

dev-restart:
	docker compose $(ENV_FILE) $(DEV) restart frontend

# ── PRODUCCIÓN ───────────────────────────────────────────────

prod-up:
	docker compose $(ENV_FILE) $(PROD) up --build -d

prod-down:
	docker compose $(ENV_FILE) $(PROD) down

prod-logs:
	docker compose $(ENV_FILE) $(PROD) logs -f

# ── UTILIDADES ───────────────────────────────────────────────

ps:
	docker compose $(ENV_FILE) $(DEV) ps

shell:
	docker exec -it techmock_frontend sh

clean:
	docker compose $(ENV_FILE) $(BASE) down -v --remove-orphans

health:
	@curl -s http://localhost:3000 -o /dev/null -w "HTTP status: %{http_code}\n"

# Fuerza rebuild completo sin cache (útil cuando cambias next.config.ts)
rebuild:
	docker compose $(ENV_FILE) $(DEV) build --no-cache
	docker compose $(ENV_FILE) $(DEV) up -d

.PHONY: dev-up dev-up-d dev-down dev-logs dev-restart \
        prod-up prod-down prod-logs \
        ps shell clean health rebuild