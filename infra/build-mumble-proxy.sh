#!/bin/bash
# build-mumble-proxy.sh - скрипт для сборки mumble-web-proxy
# Автоматически выбирает подходящий метод сборки

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Сборка mumble-web-proxy ==="
echo ""

# Проверяем наличие Podman
if ! command -v podman &> /dev/null; then
    echo "Ошибка: не найден podman"
    echo "Установите Podman:"
    echo "  Fedora/RHEL: sudo dnf install podman"
    echo "  Ubuntu/Debian: sudo apt install podman"
    exit 1
fi

CONTAINER_CMD="podman"

echo "Используется: $CONTAINER_CMD"
echo ""

# Проверяем архитектуру
ARCH=$(uname -m)
echo "Архитектура: $ARCH"
echo ""

# Вариант 1: Multi-stage сборка из форка с Alpine runtime
echo "Вариант 1: Multi-stage сборка из форка (рекомендуется)"
echo "  - Этап 1: Компиляция из форка ZwerG-MaX/mumble-web-proxy-rust-1.89"
echo "  - Этап 2: Лёгкий Alpine образ для runtime"
echo "Время сборки: ~5-10 минут"
echo ""

# Вариант 2: Готовый бинарник с Alpine runtime
echo "Вариант 2: Готовый бинарник из GitHub releases (быстро)"
echo "  - Загрузка готового бинарника"
echo "  - Alpine образ для runtime"
echo "Время сборки: ~1 минута"
echo ""

if [ "$1" = "--quick" ]; then
    echo "Используется быстрый вариант (готовый бинарник)"
    VARIANT="alternative"
else
    echo "Выберите вариант:"
    echo "  1) Multi-stage сборка из форка (рекомендуется, ~5-10 минут)"
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
    echo "Multi-stage сборка из форка..."
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
echo "Размер образа:"
$CONTAINER_CMD images rt-mumble-web-proxy:latest --format "{{.Size}}"
echo ""
echo "Для запуска:"
echo "  $CONTAINER_CMD run -d --name rt-mumble-proxy \\"
echo "    -p 1337:1337 -p 64737:64737/udp \\"
echo "    rt-mumble-web-proxy:latest"
echo ""
echo "Или используйте Quadlet:"
echo "  systemctl --user start rt-mumble-proxy"
