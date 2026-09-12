# Миграция на Podman — Завершено ✅

## Статус

**Миграция завершена успешно**

Проект полностью переведён на Podman. Docker и docker-compose больше не поддерживаются.

## Дата миграции

2026-09-12

## Что было сделано

### 1. Удалены файлы Docker
- ❌ `docker-compose.yml` — удалён
- ❌ `docker-compose.podman.yml` — удалён

### 2. Созданы файлы Podman
- ✅ `podman-compose.yml` — основной файл конфигурации для Podman Compose
- ✅ `PODMAN-MIGRATION.md` — полное руководство по миграции на Podman
- ✅ `MIGRATION-CHANGES.md` — полный список изменений
- ✅ `USAGE.md` — инструкция по использованию
- ✅ `FINAL-CHECK.md` — финальная проверка миграции
- ✅ `update-all-files.sh` — скрипт для обновления всех файлов
- ✅ `migrate-to-podman.sh` — скрипт для массовой замены упоминаний Docker

### 3. Обновлены скрипты
- ✅ `infra/build-mumble-proxy.sh` — убрана проверка на Docker, только Podman
- ✅ `infra/rebuild-mumble-proxy.sh` — `docker-compose` → `podman-compose`
- ✅ `quadlet/install-quadlet.sh` — обновлены команды
- ✅ `quadlet/diagnose-mumble-proxy.sh` — обновлены команды

### 4. Обновлена документация
- ✅ `README.md` — добавлена секция "Развёртывание через Podman Compose"
- ✅ `SOLUTION.md` — убраны упоминания Docker
- ✅ `SUMMARY.md` — добавлена информация о миграции
- ✅ Все файлы в `infra/` — обновлены команды
- ✅ Все файлы в `quadlet/` — обновлены команды и пути

### 5. Обновлены Quadlet файлы
- ✅ `quadlet/rt-traefik.container` — `providers.docker` → `providers.podman`
- ✅ Все `.container` файлы — обновлены пути к сокетам

## Ключевые изменения

### Traefik конфигурация

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

### Команды запуска

**Было (Docker):**
```bash
docker-compose up -d --build
docker compose up -d --build
```

**Стало (Podman):**
```bash
podman-compose up -d --build
```

### Пути к сокетам

**Было:**
- `/var/run/docker.sock`
- `/run/docker.sock`

**Стало:**
- `/run/user/1000/podman/podman.sock` (rootless)
- `/run/podman/podman.sock` (rootful)

## Быстрый старт

### 1. Установка Podman

**Fedora/RHEL:**
```bash
sudo dnf install podman podman-compose
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install podman podman-compose
```

### 2. Запуск проекта

```bash
# Запуск всего стека
podman-compose up -d --build

# Проверка статуса
podman-compose ps

# Просмотр логов
podman-compose logs -f
```

### 3. Доступ к сервисам

| Сервис | URL | Описание |
|--------|-----|----------|
| **Пульт** | http://localhost:8082 | Веб-интерфейс пульта |
| **ONLYOFFICE** | http://localhost:8080 | Document Server |
| **Nextcloud** | http://localhost:8090 | Хранилище документов |
| **PostgREST API** | http://localhost:3000 | REST API |
| **Mumble** | localhost:64738 | Голосовой сервер |
| **mumble-web** | http://localhost:8081 | Веб-клиент Mumble |
| **MediaMTX** | http://localhost:8888 | Медиа-прокси |
| **Traefik Dashboard** | http://localhost:8080 | Панель управления |

## Quadlet (systemd интеграция)

```bash
# Установка Quadlet-конфигурации
chmod +x quadlet/install-quadlet.sh
./quadlet/install-quadlet.sh install

# Запуск стека
systemctl --user start rt-dopros.target

# Включить автозапуск при загрузке
systemctl --user enable rt-dopros.target

# Проверка статуса
systemctl --user status rt-dopros.target
```

## Проверка миграции

### 1. Проверка отсутствия Docker

```bash
# Должно быть пусто
grep -r "docker" --include="*.yml" --include="*.yaml" . | grep -v node_modules | grep -v ".git" | grep -v "Dockerfile"
```

### 2. Проверка наличия Podman

```bash
# Должны быть файлы
ls -la podman-compose.yml
ls -la PODMAN-MIGRATION.md
ls -la USAGE.md
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

## Документация

- [README.md](README.md) — основная документация проекта
- [PODMAN-MIGRATION.md](PODMAN-MIGRATION.md) — руководство по миграции на Podman
- [MIGRATION-CHANGES.md](MIGRATION-CHANGES.md) — полный список изменений
- [USAGE.md](USAGE.md) — инструкция по использованию
- [FINAL-CHECK.md](FINAL-CHECK.md) — финальная проверка миграции
- [QUADLET.md](QUADLET.md) — документация по Quadlet
- [QUADLET-README.md](QUADLET-README.md) — краткое руководство по Quadlet

## Преимущества Podman

1. **Без демона** — не требует фонового сервиса
2. **Rootless** — работает без root-прав по умолчанию
3. **Совместимость** — полностью совместим с Docker CLI
4. **Безопасность** — изоляция на уровне пользователя
5. **Quadlet** — нативная интеграция с systemd

## Отличия от Docker

| Docker | Podman |
|--------|--------|
| `docker-compose up -d` | `podman-compose up -d` |
| `docker compose up -d` | `podman-compose up -d` |
| `docker build` | `podman build` |
| `docker run` | `podman run` |
| `/var/run/docker.sock` | `/run/user/1000/podman/podman.sock` |
| `providers.docker` (Traefik) | `providers.podman` (Traefik) |
| Требует демон | Без демона |
| Требует root | Rootless по умолчанию |

## Устранение неполадок

### Podman socket не активен

```bash
systemctl --user enable --now podman.socket
```

### Контейнер не запускается

```bash
# Проверить логи
podman logs -f <container-name>

# Проверить конфигурацию
podman inspect <container-name>

# Перезапустить контейнер
podman restart <container-name>
```

### Ошибка доступа к сокету

Убедитесь, что Podman socket запущен:

```bash
systemctl --user status podman.socket
```

## Заключение

✅ **Миграция на Podman завершена успешно**

✅ Все файлы конфигурации обновлены

✅ Все скрипты обновлены

✅ Вся документация обновлена

✅ Проект готов к использованию

Проект теперь использует только Podman для управления контейнерами. Docker и docker-compose больше не поддерживаются.

## Поддержка

Если возникли проблемы:

1. Проверьте логи: `podman logs -f <container-name>`
2. Проверьте статус: `podman-compose ps`
3. Перезапустите сервисы: `podman-compose restart`
4. Обратитесь к документации в директории `quadlet/`

## Важные замечания

1. **Только Podman** — проект использует только Podman. Docker и docker-compose не поддерживаются.
2. **Rootless режим** — по умолчанию Podman работает в rootless режиме без root-прав.
3. **Quadlet** — для production-развёртывания рекомендуется использовать Quadlet с systemd.
4. **Podman Compose** — для быстрого развёртывания используйте `podman-compose`.

---

**Дата:** 2026-09-12  
**Статус:** ✅ Завершено  
**Версия:** Podman-only
