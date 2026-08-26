# GMAO Docker commands
# Usage: make <target>

.PHONY: help setup up down build restart logs shell-php shell-db key migrate seed ps clean

help:
	@echo ""
	@echo "  GMAO App - Docker Commands"
	@echo "  ────────────────────────────────────────"
	@echo "  make setup      First-time setup (copy env, build, start)"
	@echo "  make up         Start all services"
	@echo "  make down       Stop all services"
	@echo "  make build      Rebuild all images"
	@echo "  make restart    Restart all services"
	@echo "  make logs       Tail logs (all services)"
	@echo "  make ps         Show running containers"
	@echo "  make key        Generate Laravel APP_KEY"
	@echo "  make migrate    Run database migrations"
	@echo "  make seed       Run database seeders"
	@echo "  make shell-php  Open shell in PHP container"
	@echo "  make shell-db   Open MySQL shell"
	@echo "  make clean      Remove containers + volumes (DELETES DATA)"
	@echo ""

setup:
	@if [ ! -f .env ]; then cp .env.docker .env; echo "Created .env from template — edit it before continuing"; exit 1; fi
	docker compose build
	docker compose up -d
	@echo ""
	@echo "  App running at http://localhost"
	@echo "  Run 'make key' if you haven't set APP_KEY yet"

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

restart:
	docker compose restart

logs:
	docker compose logs -f

ps:
	docker compose ps

key:
	docker compose exec php php artisan key:generate --show

migrate:
	docker compose exec php php artisan migrate --force

seed:
	docker compose exec php php artisan db:seed --force

shell-php:
	docker compose exec php sh

shell-db:
	docker compose exec db mysql -u${DB_USERNAME:-gmao_user} -p${DB_PASSWORD:-gmao_pass} ${DB_DATABASE:-gmao}

clean:
	@echo "WARNING: This will delete all data including the database."
	@read -p "Are you sure? (yes/no): " c; [ "$$c" = "yes" ] && docker compose down -v || echo "Aborted."
