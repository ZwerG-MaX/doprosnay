# Миграция на Podman

## Обзор

Проект полностью переведён на **Podman** как единую систему управления контейнерами. Docker и docker-compose больше не поддерживаются.

## Преимущества Podman

- **Без демона** — не требует фонового сервиса
- **Rootless** — работает без root-прав по умолчанию
- **Совместимость** — полностью совместим с Docker CLI
- **Безопасность** — изоляция на уровне пользователя
- **Quadlet** — нативная интеграция с systemd

## Установка Podman

### Fedora/RHEL
```bash
sudo dnf install podman podman-compose
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install podman podman-compose
```

### Проверка установки
```bash
podman --version
podman-compose --version
```

## Быстрый старт

### 1. Развёртывание через Podman Compose

```bash
# Установка podman-compose (если ещё не установлен)
pip install podman-compose

# Клонирование проекта
git clone <repository-url>
cd <project-directory>

# Запуск всего стека
podman-compose up -d --build

# Проверка статуса
podman-compose ps

# Просмотр логов
podman-compose logs -f

# Остановка стека
podman-compose down
```

### 2. Развёртывание через Podman Quadlet

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

## Основные команды

### Podman Compose

```bash
# Запуск стека
podman-compose up -d

# Остановка стека
podman-compose down

# Пересборка образов
podman-compose build

# Просмотр логов
podman-compose logs -f [service]

# Статус контейнеров
podman-compose ps

# Выполнение команды в контейнере
podman-compose exec <service> <command>
```

### Podman (прямые команды)

```bash
# Сборка образа
podman build -t <image-name> -f <Dockerfile> .

# Запуск контейнера
podman run -d --name <container-name> <image-name>

# Остановка контейнера
podman stop <container-name>

# Удаление контейнера
podman rm <container-name>

# Просмотр логов
podman logs -f <container-name>

# Список образов
podman images

# Удаление образа
podman rmi <image-name>

# Очистка неиспользуемых ресурсов
podman system prune -a
```

## Файлы конфигурации

### podman-compose.yml

Основной файл конфигурации для Podman Compose. Заменяет `docker-compose.yml`.

**Основные изменения:**
- Провайдер Traefik: `providers.podman` вместо `providers.docker`
- Путь к сокету: `/run/user/1000/podman/podman.sock` вместо `/var/run/docker.sock`
- Все команды используют `podman` вместо `docker`

### Quadlet файлы

Расположены в директории `quadlet/`:
- `*.container` — конфигурация контейнеров
- `*.volume` — конфигурация томов
- `*.network` — конфигурация сетей
- `*.target` — целевой юнит для запуска всего стека

## Доступ к сервисам

После запуска стека сервисы доступны по следующим адресам:

| Сервис | URL | Описание |
|--------|-----|----------|
| Пульт | http://localhost:8082 | Веб-интерфейс пульта |
| ONLYOFFICE | http://localhost:8080 | Document Server |
| Nextcloud | http://localhost:8090 | Хранилище документов |
| PostgREST API | http://localhost:3000 | REST API |
| Mumble | localhost:64738 | Голосовой сервер |
| mumble-web | http://localhost:8081 | Веб-клиент Mumble |
| MediaMTX | http://localhost:8888 | Медиа-прокси |
| Traefik Dashboard | http://localhost:8080 | Панель управления |

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

## Дополнительная информация

- [Документация Podman](https://docs.podman.io/)
- [Документация Podman Compose](https://github.com/containers/podman-compose)
- [Quadlet документация](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [QUADLET.md](QUADLET.md) — подробная документация по Quadlet
- [QUADLET-README.md](QUADLET-README.md) — краткое руководство по Quadlet

## Поддержка

Если возникли проблемы:

1. Проверьте логи: `podman logs -f <container-name>`
2. Проверьте статус: `podman-compose ps`
3. Перезапустите сервисы: `podman-compose restart`
4. Обратитесь к документации в директории `quadlet/`

## Заключение

Проект полностью использует Podman для управления контейнерами. Docker и docker-compose больше не поддерживаются. Все скрипты и документация обновлены для работы с Podman.
