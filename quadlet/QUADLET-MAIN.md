# Развёртывание через Podman Quadlet (основной метод)

**Это основной рекомендуемый метод развёртывания проекта.**

## Почему Quadlet?

- **Интеграция с systemd** — управление через `systemctl` и `journalctl`
- **Автозапуск** — сервисы запускаются при загрузке системы
- **Rootless режим** — работает без root-прав
- **Мониторинг** — встроенный мониторинг и логирование
- **Зависимости** — автоматический порядок запуска сервисов
- **Надёжность** — автоматический перезапуск при сбоях

## Быстрый старт

### 1. Установка

```bash
# Установка Quadlet-конфигурации
chmod +x quadlet/install-quadlet.sh
./quadlet/install-quadlet.sh install
```

Скрипт автоматически:
- Проверит Podman 4.0+
- Скопирует Quadlet-файлы в `~/.config/containers/systemd/`
- Скопирует конфигурацию в `~/.config/rt-dopros/`
- Обновит пути в container-файлах
- Соберёт Docker-образы
- Перезагрузит systemd

### 2. Запуск

```bash
# Запуск всех сервисов
systemctl --user start rt-dopros.target

# Проверка статуса
systemctl --user status rt-dopros.target

# Включить автозапуск при загрузке
systemctl --user enable rt-dopros.target
```

### 3. Доступ к сервисам

После запуска сервисы доступны по следующим адресам:

| Сервис | URL | Описание |
|--------|-----|----------|
| **Пульт** | http://pult.local или http://localhost:8082 | Веб-интерфейс пульта |
| **ONLYOFFICE** | http://docs.local или http://localhost:8080 | Document Server |
| **Nextcloud** | http://cloud.local или http://localhost:8090 | Хранилище документов |
| **PostgREST API** | http://api.local или http://localhost:3000 | REST API |
| **Mumble** | localhost:64738 | Голосовой сервер |
| **mumble-web** | http://mumble.local или http://localhost:8081 | Веб-клиент Mumble |
| **MediaMTX** | http://localhost:8888 | Медиа-прокси |
| **Traefik Dashboard** | http://localhost:8080 | Панель управления |

## Управление сервисами

### Запуск/остановка

```bash
# Запуск всех сервисов
systemctl --user start rt-dopros.target

# Остановка всех сервисов
systemctl --user stop rt-dopros.target

# Перезапуск всех сервисов
systemctl --user restart rt-dopros.target

# Проверка статуса
systemctl --user status rt-dopros.target
```

### Управление отдельными сервисами

```bash
# Запуск/остановка отдельного сервиса
systemctl --user start rt-pult
systemctl --user stop rt-db

# Перезапуск отдельного сервиса
systemctl --user restart rt-docs

# Проверка статуса отдельного сервиса
systemctl --user status rt-api
```

### Просмотр логов

```bash
# Логи всех сервисов
journalctl --user -u rt-dopros.target -f

# Логи отдельного сервиса
journalctl --user -u rt-pult.service -f

# Последние 100 строк
journalctl --user -u rt-dopros.target -n 100
```

### Автозапуск

```bash
# Включить автозапуск при загрузке
systemctl --user enable rt-dopros.target

# Отключить автозапуск
systemctl --user disable rt-dopros.target
```

## Структура Quadlet файлов

### Сеть
- `rt-dopros-net.network` — пользовательская сеть для всех сервисов

### Тома
- `rt-dopros-db-data.volume` — том для PostgreSQL
- `rt-dopros-cloud-data.volume` — том для Nextcloud
- `rt-dopros-mumble-data.volume` — том для Mumble
- `rt-dopros-docs-data.volume` — том для ONLYOFFICE

### Контейнеры
- `rt-db.container` — PostgreSQL 16
- `rt-api.container` — PostgREST API
- `rt-docs.container` — ONLYOFFICE Document Server
- `rt-cloud.container` — Nextcloud
- `rt-mumble.container` — Mumble (Murmur)
- `rt-mumble-proxy.container` — mumble-web-proxy
- `rt-mumble-web.container` — mumble-web
- `rt-media.container` — MediaMTX
- `rt-traefik.container` — Traefik reverse proxy
- `rt-pult.container` — пульт наблюдения

### Целевой юнит
- `rt-dopros.target` — управление всем стеком

## Traefik интеграция

Все сервисы настроены с labels для Traefik:

```ini
Label=traefik.enable=true
Label=traefik.http.routers.pult.rule=Host(`pult.local`)
Label=traefik.http.routers.pult.entrypoints=web
Label=traefik.http.services.pult.loadbalancer.server.port=80
```

Это позволяет:
- Доступ к сервисам по доменным именам
- Автоматическую маршрутизацию трафика
- Централизованное управление через Traefik

## Удаление

```bash
# Автоматическое удаление
./quadlet/install-quadlet.sh uninstall

# Или вручную:
systemctl --user stop rt-dopros.target
systemctl --user disable rt-dopros.target
rm ~/.config/containers/systemd/rt-*.{network,volume,container,target}
systemctl --user daemon-reload
```

## Устранение неполадок

### Podman socket не активен

```bash
systemctl --user enable --now podman.socket
```

### Сервис не запускается

```bash
# Проверить логи
journalctl --user -u rt-pult.service -n 50

# Проверить конфигурацию
systemctl --user cat rt-pult.service

# Перезапустить systemd
systemctl --user daemon-reload
```

### Образы не собраны

```bash
# Собрать вручную
podman build -t rt-pult:latest -f Dockerfile .
podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/
```

### Порты заняты

Измените порты в соответствующих `.container` файлах в `~/.config/containers/systemd/`:

```ini
# Пример: изменить порт пульта с 8082 на 8083
PublishPort=8083:80
```

Затем перезагрузите systemd:

```bash
systemctl --user daemon-reload
systemctl --user restart rt-pult
```

## Дополнительная информация

- [QUADLET.md](../QUADLET.md) — полная документация по Quadlet
- [QUADLET-README.md](../QUADLET-README.md) — краткое руководство
- [PRODUCTION.md](PRODUCTION.md) — production-конфигурация с HTTPS
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — общее руководство по устранению неполадок

## Сравнение с Podman Compose

| Quadlet | Podman Compose |
|---------|----------------|
| Интеграция с systemd | Отдельный процесс |
| Автозапуск из коробки | Требует дополнительной настройки |
| Мониторинг через journalctl | Логи через `podman-compose logs` |
| Управление через `systemctl` | Управление через `podman-compose` |
| Rootless по умолчанию | Rootless по умолчанию |
| Рекомендуется для production | Подходит для разработки |

## Рекомендации

- **Production**: используйте Quadlet
- **Разработка**: можно использовать Podman Compose
- **Тестирование**: можно использовать Podman Compose
- **CI/CD**: используйте Quadlet

Quadlet обеспечивает более надёжное и управляемое развёртывание для production-окружения.
