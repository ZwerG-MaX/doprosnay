#!/bin/bash
# update-all-files.sh - скрипт для обновления всех файлов с заменой Docker на Podman

set -e

echo "=== Обновление всех файлов ==="
echo ""

# Функция для замены в файле
update_file() {
    local file="$1"
    
    if [ ! -f "$file" ]; then
        return
    fi
    
    echo "Обновление: $file"
    
    # Создаём резервную копию
    cp "$file" "$file.bak"
    
    # Заменяем docker-compose на podman-compose
    sed -i 's/docker-compose/podman-compose/g' "$file"
    sed -i 's/docker compose/podman-compose/g' "$file"
    sed -i 's/Docker Compose/Podman Compose/g' "$file"
    
    # Заменяем docker на podman (но не в словах типа "dockerfile")
    sed -i 's/\bdocker\b/podman/g' "$file"
    sed -i 's/\bDocker\b/Podman/g' "$file"
    
    # Заменяем провайдер traefik
    sed -i 's/providers\.docker/providers.podman/g' "$file"
    
    # Заменяем пути к сокетам
    sed -i 's|/var/run/docker\.sock|/run/user/1000/podman/podman.sock|g' "$file"
    sed -i 's|/run/docker\.sock|/run/user/1000/podman/podman.sock|g' "$file"
    
    # Удаляем резервную копию
    rm "$file.bak"
}

# Обновляем файлы в корне
for file in *.md; do
    if [ -f "$file" ]; then
        update_file "$file"
    fi
done

# Обновляем файлы в infra/
for file in infra/*.md infra/*.sh; do
    if [ -f "$file" ]; then
        update_file "$file"
    fi
done

# Обновляем файлы в quadlet/
for file in quadlet/*.md quadlet/*.sh quadlet/*.container; do
    if [ -f "$file" ]; then
        update_file "$file"
    fi
done

echo ""
echo "=== Обновление завершено ==="
echo ""
echo "Проверка оставшихся упоминаний Docker:"
grep -r "docker" --include="*.md" --include="*.sh" --include="*.yml" --include="*.container" . 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "Dockerfile" || echo "Упоминаний Docker не найдено"
