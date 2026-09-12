#!/bin/bash
# migrate-to-podman.sh - скрипт для замены всех упоминаний Docker на Podman

set -e

echo "=== Замена Docker на Podman во всех файлах ==="
echo ""

# Массив файлов для обновления
FILES=(
    "README.md"
    "QUADLET.md"
    "QUADLET-README.md"
    "SOLUTION.md"
    "SUMMARY.md"
    "infra/SOLUTION.md"
    "infra/FINAL-SOLUTION.md"
    "infra/MUMBLE-PROXY-BUILD.md"
    "infra/MUMBLE-PROXY-SETUP.md"
    "infra/FINAL-SUMMARY.md"
    "infra/FIX-GLIBC-MUSL.md"
    "infra/FIX-LIBNICE.md"
    "infra/QUICK-FIX.md"
    "quadlet/PRODUCTION.md"
    "quadlet/TROUBLESHOOTING.md"
    "quadlet/QUICKSTART.md"
)

# Функция для замены в файле
replace_in_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        echo "Файл не найден: $file"
        return
    fi
    
    echo "Обновление: $file"
    
    # Заменяем docker на podman
    sed -i 's/docker-compose/podman-compose/g' "$file"
    sed -i 's/docker compose/podman-compose/g' "$file"
    sed -i 's/Docker Compose/Podman Compose/g' "$file"
    sed -i 's/docker-compose.yml/podman-compose.yml/g' "$file"
    sed -i 's/docker\.sock/podman\.sock/g' "$file"
    sed -i 's/docker\.socket/podman\.socket/g' "$file"
    
    # Заменяем docker на podman (но не в словах типа "dockerfile")
    sed -i 's/\bdocker\b/podman/g' "$file"
    sed -i 's/\bDocker\b/Podman/g' "$file"
    
    # Заменяем провайдер traefik
    sed -i 's/providers\.docker/providers\.podman/g' "$file"
    
    # Заменяем пути к сокетам
    sed -i 's|/var/run/docker\.sock|/run/user/1000/podman/podman\.sock|g' "$file"
    sed -i 's|/run/docker\.sock|/run/user/1000/podman/podman\.sock|g' "$file"
}

# Обновляем все файлы
for file in "${FILES[@]}"; do
    replace_in_file "$file"
done

echo ""
echo "=== Обновление завершено ==="
echo ""
echo "Проверьте файлы на корректность замен:"
echo "  grep -r 'docker' --include='*.md' --include='*.sh' --include='*.yml' . | grep -v node_modules | grep -v '.git'"
