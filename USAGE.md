# Инструкция по использованию (Podman)

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

**Проверка установки:**
```bash
podman --version
podman-compose --version
```

### 2. Запуск проекта

```bash
# Клонирование проекта
git clone <repository-url>
cd <project-directory>

# Запуск всего стека
podman-compose up -d --build

# Проверка статуса
podman-compose ps

# Просмотр логов
podman-compose logs -f
```

### 3. Доступ к сервисам

После запуска сервисы доступны по следующим адресам:

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

## Основные команды

### Управление стеком

```bash
# Запуск стека
podman-compose up -d

# Остановка стека
podman-compose down

# Перезапуск стека
podman-compose restart

# Пересборка образов
podman-compose build

# Просмотр логов
podman-compose logs -f [service]

# Статус контейнеров
podman-compose ps
```

### Управление отдельными контейнерами

```bash
# Запуск контейнера
podman start <container-name>

# Остановка контейнера
podman stop <container-name>

# Перезапуск контейнера
podman restart <container-name>

# Просмотр логов
podman logs -f <container-name>

# Выполнение команды в контейнере
podman exec -it <container-name> <command>
```

### Управление образами

```bash
# Список образов
podman images

# Сборка образа
podman build -t <image-name> -f <Dockerfile> .

# Удаление образа
podman rmi <image-name>

# Очистка неиспользуемых образов
podman image prune -a
```

### Очистка ресурсов

```bash
# Очистка всех неиспользуемых ресурсов
podman system prune -a

# Очистка томов
podman volume prune

# Очистка сетей
podman network prune
```

## Quadlet (systemd интеграция)

### Установка Quadlet

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

### Управление через systemd

```bash
# Запуск стека
systemctl --user start rt-dopros.target

# Остановка стека
systemctl --user stop rt-dopros.target

# Перезапуск стека
systemctl --user restart rt-dopros.target

# Проверка статуса
systemctl --user status rt-dopros.target

# Просмотр логов
journalctl --user -u rt-dopros.target -f
```

## Устранение неполадок

### Podman socket не активен

```bash
# Проверка статуса
systemctl --user status podman.socket

# Запуск сокета
systemctl --user enable --now podman.socket
```

### Контейнер не запускается

```bash
# Проверка логов
podman logs -f <container-name>

# Проверка конфигурации
podman inspect <container-name>

# Перезапуск контейнера
podman restart <container-name>
```

### Ошибка доступа к сокету

Убедитесь, что Podman socket запущен:

```bash
systemctl --user status podman.socket
```

Если не запущен:

```bash
systemctl --user enable --now podman.socket
```

### Очистка всех ресурсов

```bash
# Остановить все контейнеры
podman stop -a

# Удалить все контейнеры
podman rm -a

# Удалить все образы
podman rmi -a

# Удалить все тома
podman volume rm -a

# Удалить все сети
podman network prune
```

## Сборка mumble-web-proxy

### Автоматическая сборка

```bash
cd infra/
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh
```

### Ручная сборка

```bash
cd infra/

# Multi-stage сборка (рекомендуется)
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .

# Или готовый бинарник (быстро)
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

### Пересборка и перезапуск

```bash
cd infra/
chmod +x rebuild-mumble-proxy.sh
./rebuild-mumble-proxy.sh
```

## Документация

- [README.md](README.md) — основная документация проекта
- [PODMAN-MIGRATION.md](PODMAN-MIGRATION.md) — руководство по миграции на Podman
- [MIGRATION-CHANGES.md](MIGRATION-CHANGES.md) — полный список изменений
- [QUADLET.md](QUADLET.md) — документация по Quadlet
- [QUADLET-README.md](QUADLET-README.md) — краткое руководство по Quadlet

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

## Заключение

Проект полностью использует Podman для управления контейнерами. Все скрипты и документация обновлены для работы с Podman. Docker и docker-compose больше не поддерживаются.
