# ═══════════════════════════════════════════════════════════════
#  Пульт наблюдения «Допросная №2» · управление стеком
#
#  По умолчанию — Docker. Для Podman:  make <цель> ENGINE=podman
#  Примеры:
#    make up                  # docker compose up -d --build
#    make up ENGINE=podman    # podman compose -f docker-compose.podman.yml up -d --build
#    make check               # проверка всех сервисов
# ═══════════════════════════════════════════════════════════════

ENGINE ?= docker

FILE_docker = docker-compose.yml
FILE_podman = docker-compose.podman.yml
COMPOSE     = $(ENGINE) compose -f $(FILE_$(ENGINE))

.PHONY: up down logs ps rebuild build check hosts clean help

help: ## список целей
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## поднять весь стек (ENGINE=docker|podman)
	$(COMPOSE) up -d --build

down: ## остановить стек
	$(COMPOSE) down

logs: ## журналы всех сервисов
	$(COMPOSE) logs -f

ps: ## статус контейнеров
	$(COMPOSE) ps

build: ## собрать образы без запуска
	$(COMPOSE) build

rebuild: ## пересобрать пульт без кеша
	$(COMPOSE) build --no-cache frontend
	$(COMPOSE) up -d frontend

hosts: ## что добавить в /etc/hosts
	@echo "127.0.0.1  pult.local docs.local cloud.local mumble.local api.local"

check: ## проверить ключевые сервисы
	@echo "── пульт ────────────────────────────────" && curl -fsSo /dev/null -w "pult.local   %{http_code}\n" http://pult.local
	@echo "── базы ─────────────────────────────────" && curl -fsSo /dev/null -w "api.local    %{http_code}\n" "http://api.local/users?select=id"
	@echo "── onlyoffice ───────────────────────────" && curl -fsS http://docs.local/healthcheck && echo "  docs.local  OK"
	@echo "── видео (MediaMTX HLS) ─────────────────" && curl -fsSo /dev/null -w "media :8888  %{http_code}\n" http://localhost:8888/cam01/index.m3u8

clean: ## остановить и удалить тома (ОСТОРОЖНО: данные БД/Nextcloud!)
	$(COMPOSE) down -v
