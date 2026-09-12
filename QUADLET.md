# Развёртывание через Podman Quadlet (systemd)

Quadlet — это современный способ управления контейнерами Podman через systemd-юниты в rootless-режиме.

## Преимущества

- **Rootless** — работает без root-прав
- **Автозапуск** — контейнеры стартуют при загрузке системы
- **Мониторинг** — интеграция с `systemctl`, `journalctl`
- **Зависимости** — автоматический порядок запуска сервисов
- **Логирование** — все логи в `journalctl`

## Предварительные требования

```bash
# Установите Podman (если ещё не установлен)
sudo apt install podman podman-compose  # Debian/Ubuntu
# или
sudo dnf install podman                 # Fedora/RHEL

# Проверьте версию (нужна 4.0+)
podman --version

# Включите rootless-режим (если ещё не включён)
systemctl --user enable --now podman.socket
```

## Установка Quadlet-файлов

### 1. Создайте директорию для Quadlet

```bash
mkdir -p ~/.config/containers/systemd
```

### 2. Скопируйте файлы из `quadlet/`

```bash
cp quadlet/*.network ~/.config/containers/systemd/
cp quadlet/*.volume ~/.config/containers/systemd/
cp quadlet/*.container ~/.config/containers/systemd/
cp quadlet/*.target ~/.config/containers/systemd/
```

### 3. Соберите кастомные образы

```bash
# Перейдите в корень проекта
cd /path/to/project

# Соберите образ пульта
podman build -t rt-pult -f Dockerfile .

# Соберите образ mumble-web-proxy
podman build -t rt-mumble-web-proxy -f infra/mumble-web-proxy.Dockerfile infra/
```

### 4. Скопируйте конфигурационные файлы

```bash
# Создайте директорию для конфигов
mkdir -p ~/.config/rt-dopros

# Скопируйте конфигурацию MediaMTX
cp infra/mediamtx.yml ~/.config/rt-dopros/

# Скопируйте SQL-инициализацию
cp infra/db/init.sql ~/.config/rt-dopros/
```

### 5. Обновите пути в container-файлах

Отредактируйте файлы в `~/.config/containers/systemd/`:

**rt-db.container** — измените путь к init.sql:
```ini
Volume=/home/YOUR_USER/.config/rt-dopros/init.sql:/docker-entrypoint-initdb.d/init.sql:ro,Z
```

**rt-media.container** — измените путь к mediamtx.yml:
```ini
Volume=/home/YOUR_USER/.config/rt-dopros/mediamtx.yml:/mediamtx.yml:ro,Z
```

**rt-traefik.container** — измените путь к Podman socket:
```ini
Volume=/run/user/1000/podman/podman.sock:/var/run/docker.sock:ro
```
(Замените `1000` на ваш UID: `id -u`)

### 6. Перезагрузите systemd

```bash
systemctl --user daemon-reload
```

## Запуск стека

### Запустить все сервисы

```bash
systemctl --user start rt-dopros.target
```

### Проверить статус

```bash
# Статус всех сервисов
systemctl --user status rt-dopros.target

# Список всех контейнеров
podman ps

# Логи всех сервисов
journalctl --user -u rt-dopros.target -f
```

### Остановить все сервисы

```bash
systemctl --user stop rt-dopros.target
```

### Автозапуск при загрузке

```bash
systemctl --user enable rt-dopros.target
```

## Управление отдельными сервисами

```bash
# Запустить/остановить отдельный сервис
systemctl --user start rt-db
systemctl --user stop rt-api

# Перезапустить
systemctl --user restart rt-docs

# Посмотреть логи
journalctl --user -u rt-db -f
```

## Проверка работы

После запуска проверьте доступность сервисов:

```bash
# PostgreSQL
podman exec rt-db pg_isready -U pult

# PostgREST API
curl http://localhost:3000/users

# ONLYOFFICE
curl http://localhost:8080/healthcheck

# Nextcloud
curl -I http://localhost:8090

# Пульт
curl http://localhost:8082
```

## Настройка доменов (опционально)

Для работы с доменами добавьте в `/etc/hosts`:

```bash
sudo tee -a /etc/hosts <<EOF
127.0.0.1 pult.local docs.local cloud.local mumble.local api.local
EOF
```

Затем настройте Traefik для маршрутизации по доменам (требует дополнительной конфигурации).

## Удаление

```bash
# Остановить и удалить все сервисы
systemctl --user stop rt-dopros.target
systemctl --user disable rt-dopros.target

# Удалить Quadlet-файлы
rm ~/.config/containers/systemd/rt-*.{network,volume,container,target}

# Перезагрузить systemd
systemctl --user daemon-reload

# Удалить данные (опционально)
podman volume rm rt-dopros-db-data rt-dopros-cloud-data rt-dopros-mumble-data rt-dopros-docs-data
podman network rm rt-dopros-net
```

## Отладка

### Проверка генерации systemd-юнитов

Quadlet автоматически генерирует systemd-юниты из `.container` файлов:

```bash
# Посмотреть сгенерированные юниты
systemctl --user cat rt-db.service

# Проверить синтаксис
systemd-analyze verify ~/.config/containers/systemd/rt-db.container
```

### Просмотр логов контейнера

```bash
# Через Podman
podman logs -f rt-db

# Через journalctl
journalctl --user -u rt-db.service -f
```

### Вход в контейнер

```bash
podman exec -it rt-db sh
```

## Отличия от docker-compose

| docker-compose | Quadlet |
|----------------|---------|
| `docker compose up -d` | `systemctl --user start rt-dopros.target` |
| `docker compose down` | `systemctl --user stop rt-dopros.target` |
| `docker compose logs -f` | `journalctl --user -u rt-dopros.target -f` |
| `docker compose restart` | `systemctl --user restart rt-dopros.target` |
| Автозапуск через `restart: unless-stopped` | `systemctl --user enable rt-dopros.target` |

## Ограничения

1. **Labels** — Quadlet не поддерживает Docker labels напрямую. Для Traefik-интеграции используйте network aliases или настройте маршрутизацию вручную.

2. **Build** — Quadlet не умеет собирать образы на лету. Нужно предварительно собрать образы через `podman build`.

3. **Compose-совместимость** — Quadlet не читает `docker-compose.yml`. Каждый сервис описывается отдельным `.container` файлом.

## Дополнительные ресурсы

- [Podman Quadlet документация](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [Podman rootless](https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md)
- [Systemd user services](https://wiki.archlinux.org/title/Systemd/User)
