#!/usr/bin/env bash
# diagnose-mumble-proxy.sh — диагностика проблем с mumble-web-proxy

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=== Диагностика mumble-web-proxy ==="
echo ""

# Проверка Podman
if ! command -v podman &> /dev/null; then
    log_error "Podman не установлен"
    exit 1
fi
log_success "Podman установлен: $(podman --version)"

# Проверка образа
if podman image exists rt-mumble-web-proxy:latest; then
    log_success "Образ rt-mumble-web-proxy существует"
    
    # Проверка размера образа
    SIZE=$(podman image inspect rt-mumble-web-proxy:latest --format '{{.Size}}' | numfmt --to=iec)
    log_info "Размер образа: $SIZE"
else
    log_warn "Образ rt-mumble-web-proxy не найден"
    echo ""
    echo "Для сборки образа выполните:"
    echo "  podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/"
    echo ""
    echo "Или используйте альтернативный вариант:"
    echo "  podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile.alternative infra/"
fi

# Проверка контейнера
if podman ps -a --format '{{.Names}}' | grep -q "^rt-mumble-proxy$"; then
    log_success "Контейнер rt-mumble-proxy существует"
    
    # Проверка статуса
    STATUS=$(podman ps -a --filter name=rt-mumble-proxy --format '{{.Status}}')
    if echo "$STATUS" | grep -q "Up"; then
        log_success "Контейнер запущен: $STATUS"
    else
        log_warn "Контейнер остановлен: $STATUS"
        echo ""
        echo "Для запуска:"
        echo "  podman start rt-mumble-proxy"
    fi
    
    # Проверка логов
    echo ""
    log_info "Последние 10 строк логов:"
    podman logs --tail 10 rt-mumble-proxy 2>&1 | sed 's/^/  /'
else
    log_warn "Контейнер rt-mumble-proxy не существует"
fi

# Проверка Quadlet
if [ -f "$HOME/.config/containers/systemd/rt-mumble-proxy.container" ]; then
    log_success "Quadlet-файл существует"
    
    # Проверка systemd
    if systemctl --user is-active --quiet rt-mumble-proxy.service 2>/dev/null; then
        log_success "Systemd service активен"
    else
        log_warn "Systemd service не активен"
        echo ""
        echo "Для запуска:"
        echo "  systemctl --user start rt-mumble-proxy"
    fi
else
    log_warn "Quadlet-файл не найден"
fi

# Проверка портов
echo ""
log_info "Проверка портов:"
if ss -tulpn 2>/dev/null | grep -q ":64737"; then
    log_success "Порт 64737 (UDP) слушается"
else
    log_warn "Порт 64737 не слушается"
fi

if ss -tulpn 2>/dev/null | grep -q ":1337"; then
    log_success "Порт 1337 (TCP) слушается"
else
    log_warn "Порт 1337 не слушается"
fi

# Проверка зависимостей
echo ""
log_info "Проверка зависимостей:"
if podman ps --format '{{.Names}}' | grep -q "^rt-mumble$"; then
    log_success "rt-mumble запущен"
else
    log_warn "rt-mumble не запущен"
fi

if podman network exists rt-dopros-net 2>/dev/null; then
    log_success "Сеть rt-dopros-net существует"
else
    log_warn "Сеть rt-dopros-net не существует"
fi

echo ""
echo "=== Диагностика завершена ==="
echo ""
echo "Для полной переустановки mumble-web-proxy:"
echo "  1. Удалите старый образ:"
echo "     podman rmi rt-mumble-web-proxy:latest"
echo ""
echo "  2. Пересоберите:"
echo "     podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/"
echo ""
echo "  3. Перезапустите:"
echo "     systemctl --user restart rt-mumble-proxy"
echo ""
echo "Подробная документация: quadlet/TROUBLESHOOTING.md"
