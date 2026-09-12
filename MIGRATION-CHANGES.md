# Полный список изменений: Миграция на Podman

## Дата миграции
2026-09-12

## Обзор изменений

Проект полностью переведён с Docker на Podman как единую систему управления контейнерами.

## Удалённые файлы

- `docker-compose.yml` — заменён на `podman-compose.yml`
- `docker-compose.podman.yml` — больше не нужен

## Созданные файлы

### Основные конфигурационные файлы

1. **`podman-compose.yml`**
   - Основной файл конфигурации для Podman Compose
   - Заменяет `docker-compose.yml`
   - Провайдер Traefik: `providers.podman`
   - Путь к сокету: `/run/user/1000/podman/podman.sock`

2. **`PODMAN-MIGRATION.md`**
   - Полное руководство по миграции на Podman
   - Установка Podman
   - Основные команды
   - Устранение неполадок
   - Отличия от Docker

3. **`migrate-to-podman.sh`**
   - Скрипт для массовой замены упоминаний Docker на Podman
   - Обновляет все файлы документации

### Скрипты (обновлённые)

4. **`infra/build-mumble-proxy.sh`**
   - Убрана проверка на Docker
   - Оставлена только проверка на Podman
   - Все команды используют `podman`

5. **`infra/rebuild-mumble-proxy.sh`**
   - Убрана проверка на Docker
   - `docker-compose` заменён на `podman-compose`
   - Проверка `podman-compose.yml` вместо `docker-compose.yml`

## Обновлённые файлы

### Документация

- `README.md` — добавлена секция "Развёртывание через Podman Compose"
- `SOLUTION.md` — убраны упоминания Docker
- `SUMMARY.md` — добавлена информация о миграции
- `QUADLET.md` — обновлены команды и пути
- `QUADLET-README.md` — обновлены команды
- `infra/SOLUTION.md` — убраны упоминания Docker
- `infra/FINAL-SOLUTION.md` — обновлены команды
- `infra/MUMBLE-PROXY-BUILD.md` — обновлены команды
- `infra/MUMBLE-PROXY-SETUP.md` — обновлены команды
- `infra/FINAL-SUMMARY.md` — обновлены команды
- `infra/FIX-GLIBC-MUSL.md` — обновлены команды
- `infra/FIX-LIBNICE.md` — обновлены команды
- `infra/QUICK-FIX.md` — обновлены команды
- `quadlet/PRODUCTION.md` — обновлены команды и пути
- `quadlet/TROUBLESHOOTING.md` — обновлены команды
- `quadlet/QUICKSTART.md` — обновлены команды

### Quadlet файлы

- `quadlet/rt-traefik.container` — обновлён путь к сокету
- `quadlet/install-quadlet.sh` — обновлены команды
- `quadlet/diagnose-mumble-proxy.sh` — обновлены команды

## Ключевые изменения

### 1. Traefik конфигурация

**Было (Docker):**
```yaml
command:
  - "--providers.docker=true"
  - "--providers.docker.exposedbydefault=false"
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

**Стало (Podman):**
```yaml
command:
  - "--providers.podman=true"
  - "--providers.podman.exposedbydefault=false"
volumes:
  - /run/user/1000/podman/podman.sock:/run/podman/podman.sock:ro
```

### 2. Команды запуска

**Было (Docker):**
```bash
docker-compose up -d --build
docker compose up -d --build
```

**Стало (Podman):**
```bash
podman-compose up -d --build
```

### 3. Скрипты

**Было:**
```bash
if command -v podman &> /dev/null; then
    CONTAINER_CMD="podman"
elif command -v docker &> /dev/null; then
    CONTAINER_CMD="docker"
else
    echo "Ошибка: не найден podman или docker"
    exit 1
fi
```

**Стало:**
```bash
if ! command -v podman &> /dev/null; then
    echo "Ошибка: не найден podman"
    exit 1
fi
CONTAINER_CMD="podman"
```

### 4. Пути к сокетам

**Было:**
- `/var/run/docker.sock`
- `/run/docker.sock`

**Стало:**
- `/run/user/1000/podman/podman.sock` (rootless)
- `/run/podman/podman.sock` (rootful)

## Проверка миграции

### 1. Проверка отсутствия Docker

```bash
# Должно быть пусто
grep -r "docker" --include="*.yml" --include="*.yaml" . | grep -v node_modules | grep -v ".git"
grep -r "docker" --include="*.sh" . | grep -v node_modules | grep -v ".git"
```

### 2. Проверка наличия Podman

```bash
# Должны быть файлы
ls -la podman-compose.yml
ls -la PODMAN-MIGRATION.md
```

### 3. Проверка запуска

```bash
# Установка podman-compose
pip install podman-compose

# Запуск стека
podman-compose up -d --build

# Проверка статуса
podman-compose ps
```

## Преимущества миграции

1. **Без демона** — не требует фонового сервиса
2. **Rootless** — работает без root-прав по умолчанию
3. **Безопасность** — изоляция на уровне пользователя
4. **Quadlet** — нативная интеграция с systemd
5. **Совместимость** — полностью совместим с Docker CLI

## Обратная совместимость

Проект больше не поддерживает Docker и docker-compose. Все пользователи должны перейти на Podman.

## Документация

- [PODMAN-MIGRATION.md](PODMAN-MIGRATION.md) — полное руководство по миграции
- [README.md](README.md) — основная документация проекта
- [QUADLET.md](QUADLET.md) — документация по Quadlet

## Заключение

Миграция на Podman завершена успешно. Все файлы конфигурации, скрипты и документация обновлены. Проект теперь использует только Podman для управления контейнерами.
