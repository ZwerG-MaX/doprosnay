#!/usr/bin/env bash
# install-quadlet.sh — установка Quadlet-конфигурации для Podman
# Использование: ./install-quadlet.sh [install|uninstall|status]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
QUADLET_DIR="$HOME/.config/containers/systemd"
CONFIG_DIR="$HOME/.config/rt-dopros"
UID_NUM=$(id -u)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_podman() {
    if ! command -v podman &> /dev/null; then
        log_error "Podman не установлен"
        echo "Установите Podman:"
        echo "  Ubuntu/Debian: sudo apt install podman"
        echo "  Fedora/RHEL:   sudo dnf install podman"
        echo "  macOS:         brew install podman"
        exit 1
    fi

    local version
    version=$(podman --version | grep -oP '\d+\.\d+' | head -1)
    local major minor
    major=$(echo "$version" | cut -d. -f1)
    minor=$(echo "$version" | cut -d. -f2)

    if [[ "$major" -lt 4 ]]; then
        log_error "Требуется Podman 4.0+ (у вас $version)"
        exit 1
    fi

    log_success "Podman $version установлен"
}

check_socket() {
    if ! systemctl --user is-active --quiet podman.socket 2>/dev/null; then
        log_warn "Podman socket не активен, включаем..."
        systemctl --user enable --now podman.socket
        sleep 2
    fi
    log_success "Podman socket активен"
}

install() {
    log_info "Установка Quadlet-конфигурации..."

    # Проверки
    check_podman
    check_socket

    # Создание директорий
    log_info "Создание директорий..."
    mkdir -p "$QUADLET_DIR"
    mkdir -p "$CONFIG_DIR"

    # Копирование Quadlet-файлов
    log_info "Копирование Quadlet-файлов..."
    cp "$SCRIPT_DIR"/*.network "$QUADLET_DIR/"
    cp "$SCRIPT_DIR"/*.volume "$QUADLET_DIR/"
    cp "$SCRIPT_DIR"/*.container "$QUADLET_DIR/"
    cp "$SCRIPT_DIR"/*.target "$QUADLET_DIR/"
    log_success "Quadlet-файлы скопированы в $QUADLET_DIR"

    # Копирование конфигурационных файлов
    log_info "Копирование конфигурационных файлов..."
    cp "$PROJECT_DIR/infra/mediamtx.yml" "$CONFIG_DIR/"
    cp "$PROJECT_DIR/infra/db/init.sql" "$CONFIG_DIR/"
    log_success "Конфигурационные файлы скопированы в $CONFIG_DIR"

    # Обновление путей в container-файлах
    log_info "Обновление путей в container-файлах..."

    # rt-db.container
    sed -i.bak "s|./infra/db/init.sql|$CONFIG_DIR/init.sql|g" "$QUADLET_DIR/rt-db.container"
    rm -f "$QUADLET_DIR/rt-db.container.bak"

    # rt-media.container
    sed -i.bak "s|./infra/mediamtx.yml|$CONFIG_DIR/mediamtx.yml|g" "$QUADLET_DIR/rt-media.container"
    rm -f "$QUADLET_DIR/rt-media.container.bak"

    # rt-traefik.container
    sed -i.bak "s|/var/run/podman/podman.sock|/run/user/$UID_NUM/podman/podman.sock|g" "$QUADLET_DIR/rt-traefik.container"
    rm -f "$QUADLET_DIR/rt-traefik.container.bak"

    log_success "Пути обновлены"

    # Сборка образов
    log_info "Сборка Docker-образов..."

    if ! podman image exists rt-pult:latest; then
        log_info "Сборка образа rt-pult..."
        podman build -t rt-pult:latest -f "$PROJECT_DIR/Dockerfile" "$PROJECT_DIR"
        log_success "Образ rt-pult собран"
    else
        log_warn "Образ rt-pult уже существует, пропускаем сборку"
    fi

    if ! podman image exists rt-mumble-web-proxy:latest; then
        log_info "Сборка образа rt-mumble-web-proxy (может занять 5-10 минут)..."
        podman build -t rt-mumble-web-proxy:latest -f "$PROJECT_DIR/infra/mumble-web-proxy.Dockerfile" "$PROJECT_DIR/infra/" || {
            log_error "Не удалось собрать образ rt-mumble-web-proxy"
            log_warn "Попробуйте альтернативный вариант из PRODUCTION.md"
            exit 1
        }
        log_success "Образ rt-mumble-web-proxy собран"
    else
        log_warn "Образ rt-mumble-web-proxy уже существует, пропускаем сборку"
    fi

    # Перезагрузка systemd
    log_info "Перезагрузка systemd daemon..."
    systemctl --user daemon-reload

    log_success "Установка завершена!"
    echo ""
    echo "Для запуска стека выполните:"
    echo "  systemctl --user start rt-dopros.target"
    echo ""
    echo "Для автозапуска при загрузке:"
    echo "  systemctl --user enable rt-dopros.target"
    echo ""
    echo "Для проверки статуса:"
    echo "  systemctl --user status rt-dopros.target"
}

uninstall() {
    log_info "Удаление Quadlet-конфигурации..."

    # Остановка сервисов
    log_info "Остановка сервисов..."
    systemctl --user stop rt-dopros.target 2>/dev/null || true
    systemctl --user disable rt-dopros.target 2>/dev/null || true

    # Удаление Quadlet-файлов
    log_info "Удаление Quadlet-файлов..."
    rm -f "$QUADLET_DIR"/rt-*.{network,volume,container,target}

    # Перезагрузка systemd
    log_info "Перезагрузка systemd daemon..."
    systemctl --user daemon-reload

    log_success "Quadlet-файлы удалены"

    echo ""
    read -p "Удалить данные (тома)? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Удаление томов..."
        podman volume rm rt-dopros-db-data rt-dopros-cloud-data rt-dopros-mumble-data rt-dopros-docs-data 2>/dev/null || true
        podman network rm rt-dopros-net 2>/dev/null || true
        log_success "Тома удалены"
    fi

    log_success "Удаление завершено"
}

status() {
    echo "=== Статус сервисов ==="
    echo ""

    # Проверка Podman
    if systemctl --user is-active --quiet podman.socket; then
        log_success "Podman socket: активен"
    else
        log_error "Podman socket: не активен"
    fi

    # Проверка target
    if systemctl --user is-active --quiet rt-dopros.target; then
        log_success "rt-dopros.target: запущен"
    else
        log_warn "rt-dopros.target: остановлен"
    fi

    echo ""
    echo "=== Контейнеры ==="
    podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "^rt-" || echo "Нет запущенных контейнеров"

    echo ""
    echo "=== Тома ==="
    podman volume ls --format "table {{.Name}}\t{{.Driver}}" | grep "^rt-" || echo "Нет томов"

    echo ""
    echo "=== Сети ==="
    podman network ls --format "table {{.Name}}\t{{.Driver}}" | grep "^rt-" || echo "Нет сетей"
}

# Основная логика
case "${1:-}" in
    install)
        install
        ;;
    uninstall)
        uninstall
        ;;
    status)
        status
        ;;
    *)
        echo "Использование: $0 {install|uninstall|status}"
        echo ""
        echo "Команды:"
        echo "  install    — установить Quadlet-конфигурацию"
        echo "  uninstall  — удалить Quadlet-конфигурацию"
        echo "  status     — показать статус сервисов"
        exit 1
        ;;
esac
