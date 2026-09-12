#!/bin/bash
# rebuild-mumble-proxy.sh - скрипт для пересборки и перезапуска mumble-web-proxy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Пересборка mumble-web-proxy ==="
echo ""

# Проверяем наличие Podman или Docker
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
    COMPOSE_CMD="podman compose"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
    COMPOSE_CMD="docker compose"
else
    echo "Ошибка: не найден podman или docker"
    exit 1
fi

echo "Используется: $CONTAINER_CMD"
echo ""

# Проверяем, используется ли docker-compose или quadlet
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
    echo "Обнаружен docker-compose.yml"
    USE_COMPOSE=true
else
    echo "docker-compose.yml не найден, используется Quadlet"
    USE_COMPOSE=false
fi

echo ""

# Выбор варианта сборки
echo "Выберите вариант сборки:"
echo "  1) Multi-stage сборка из форка (рекомендуется, ~5-10 минут)"
echo "  2) Готовый бинарник из GitHub releases (быстро, ~1 минута)"
echo ""
read -p "Ваш выбор [1/2]: " choice

case $choice in
    1)
        DOCKERFILE="mumble-web-proxy.Dockerfile"
        echo "Multi-stage сборка из форка..."
        ;;
    2)
        DOCKERFILE="mumble-web-proxy.Dockerfile.alternative"
        echo "Загрузка готового бинарника..."
        ;;
    *)
        echo "Неверный выбор, используется вариант 1"
        DOCKERFILE="mumble-web-proxy.Dockerfile"
        ;;
esac

echo ""

# Пересборка образа
cd "$PROJECT_DIR/infra"
$CONTAINER_CMD build -t rt-mumble-web-proxy:latest -f "$DOCKERFILE" .

echo ""
echo "=== Образ пересобран ==="
echo ""

# Перезапуск контейнера
if [ "$USE_COMPOSE" = true ]; then
    echo "Перезапуск через docker-compose..."
    cd "$PROJECT_DIR"
    $COMPOSE_CMD stop mumble-web-proxy
    $COMPOSE_CMD rm -f mumble-web-proxy
    $COMPOSE_CMD up -d mumble-web-proxy
else
    echo "Перезапуск через Quadlet..."
    
    # Остановить и удалить старый контейнер
    $CONTAINER_CMD stop rt-mumble-proxy 2>/dev/null || true
    $CONTAINER_CMD rm rt-mumble-proxy 2>/dev/null || true
    
    # Обновить Quadlet конфигурацию
    if [ -f "$PROJECT_DIR/quadlet/rt-mumble-proxy.container" ]; then
        cp "$PROJECT_DIR/quadlet/rt-mumble-proxy.container" "$HOME/.config/containers/systemd/"
        systemctl --user daemon-reload
    fi
    
    # Запустить заново
    systemctl --user restart rt-mumble-proxy
fi

echo ""
echo "=== Контейнер перезапущен ==="
echo ""

# Проверка логов
echo "Проверка логов (Ctrl+C для выхода):"
echo ""

if [ "$USE_COMPOSE" = true ]; then
    cd "$PROJECT_DIR"
    $COMPOSE_CMD logs -f mumble-web-proxy
else
    $CONTAINER_CMD logs -f rt-mumble-proxy
fi
