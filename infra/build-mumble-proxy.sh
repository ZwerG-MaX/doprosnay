#!/bin/bash
# build-mumble-proxy.sh - скрипт для сборки mumble-web-proxy
# Автоматически выбирает подходящий метод сборки

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Сборка mumble-web-proxy ==="
echo ""

# Проверяем наличие Podman или Docker
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
else
    echo "Ошибка: не найден podman или docker"
    exit 1
fi

echo "Используется: $CONTAINER_CMD"
echo ""

# Проверяем архитектуру
ARCH=$(uname -m)
echo "Архитектура: $ARCH"
echo ""

# Вариант 1: Попытка собрать из исходников с Debian Bullseye
echo "Вариант 1: Сборка из исходников (Debian Bullseye + OpenSSL 1.1.1)"
echo "Время сборки: ~5-10 минут"
echo ""

if [ "$1" = "--quick" ]; then
    echo "Используется быстрый вариант (готовый бинарник)"
    VARIANT="alternative"
else
    echo "Выберите вариант:"
    echo "  1) Сборка из исходников (рекомендуется, ~5-10 минут)"
    echo "  2) Готовый бинарник из GitHub releases (быстро, ~1 минута)"
    echo ""
    read -p "Ваш выбор [1/2]: " choice
    
    case $choice in
        1) VARIANT="main" ;;
        2) VARIANT="alternative" ;;
        *) 
            echo "Неверный выбор, используется вариант 1"
            VARIANT="main"
            ;;
    esac
fi

echo ""

if [ "$VARIANT" = "main" ]; then
    echo "Сборка из исходников..."
    $CONTAINER_CMD build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
else
    echo "Загрузка готового бинарника..."
    $CONTAINER_CMD build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
fi

echo ""
echo "=== Сборка завершена ==="
echo ""
echo "Проверка образа:"
$CONTAINER_CMD images | grep rt-mumble-web-proxy
echo ""
echo "Для запуска:"
echo "  $CONTAINER_CMD run -d --name rt-mumble-proxy \\"
echo "    -p 1337:1337 -p 64737:64737/udp \\"
echo "    rt-mumble-web-proxy:latest"
echo ""
echo "Или используйте Quadlet:"
echo "  systemctl --user start rt-mumble-proxy"
