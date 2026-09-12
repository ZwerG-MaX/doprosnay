# Финальная конфигурация: Quadlet как основной метод развёртывания

## Статус

✅ **Quadlet + systemd — основной метод развёртывания**

✅ **Podman Compose — альтернатива для разработки**

## Что было сделано

### 1. Quadlet файлы обновлены с labels для Traefik

Все контейнеры теперь имеют правильные labels для интеграции с Traefik:

- ✅ `rt-pult.container` — labels для Traefik
- ✅ `rt-api.container` — labels для Traefik
- ✅ `rt-docs.container` — labels для Traefik
- ✅ `rt-cloud.container` — labels для Traefik
- ✅ `rt-mumble-web.container` — labels для Traefik

Пример labels:
```ini
Label=traefik.enable=true
Label=traefik.http.routers.pult.rule=Host(`pult.local`)
Label=traefik.http.routers.pult.entrypoints=web
Label=traefik.http.services.pult.loadbalancer.server.port=80
```

### 2. Документация обновлена

- ✅ `README.md` — Quadlet указан как основной метод
- ✅ `quadlet/QUADLET-MAIN.md` — полное руководство по Quadlet
- ✅ `podman-compose.yml` — оставлен как альтернатива

### 3. Скрипты обновлены

- ✅ `quadlet/install-quadlet.sh` — основной скрипт установки
- ✅ Все скрипты используют только Podman

## Структура развёртывания

### Основной метод: Quadlet + systemd

```bash
# Установка
chmod +x quadlet/install-quadlet.sh
./quadlet/install-quadlet.sh install

# Запуск
systemctl --user start rt-dopros.target

# Автозапуск
systemctl --user enable rt-dopros.target

# Статус
systemctl --user status rt-dopros.target

# Логи
journalctl --user -u rt-dopros.target -f
```

**Преимущества:**
- ✅ Интеграция с systemd
- ✅ Автозапуск при загрузке системы
- ✅ Мониторинг через `systemctl` и `journalctl`
- ✅ Автоматический перезапуск при сбоях
- ✅ Rootless режим (без root-прав)
- ✅ Управление зависимостями между сервисами

### Альтернатива: Podman Compose

```bash
# Установка
pip install podman-compose

# Запуск
podman-compose up -d --build

# Статус
podman-compose ps

# Логи
podman-compose logs -f
```

**Когда использовать:**
- Быстрое тестирование
- Разработка
- Временное развёртывание

## Quadlet файлы

### Сеть
- `rt-dopros-net.network` — пользовательская сеть

### Тома
- `rt-dopros-db-data.volume` — PostgreSQL
- `rt-dopros-cloud-data.volume` — Nextcloud
- `rt-dopros-mumble-data.volume` — Mumble
- `rt-dopros-docs-data.volume` — ONLYOFFICE

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

| Сервис | Домен | Порт |
|--------|-------|------|
| Пульт | `pult.local` | 80 |
| ONLYOFFICE | `docs.local` | 80 |
| Nextcloud | `cloud.local` | 80 |
| PostgREST API | `api.local` | 3000 |
| mumble-web | `mumble.local` | 80 |

## Доступ к сервисам

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

## Документация

- [README.md](README.md) — основная документация проекта
- [quadlet/QUADLET-MAIN.md](quadlet/QUADLET-MAIN.md) — полное руководство по Quadlet
- [QUADLET.md](QUADLET.md) — документация по Quadlet
- [QUADLET-README.md](QUADLET-README.md) — краткое руководство по Quadlet
- [podman-compose.yml](podman-compose.yml) — альтернативная конфигурация

## Рекомендации

### Production

✅ **Используйте Quadlet + systemd**

- Интеграция с systemd
- Автозапуск при загрузке
- Мониторинг через journalctl
- Автоматический перезапуск при сбоях

### Разработка

✅ **Можно использовать Podman Compose**

- Быстрое тестирование
- Простое управление
- Не требует настройки systemd

### Тестирование

✅ **Можно использовать Podman Compose**

- Быстрое развёртывание
- Легко остановить и удалить

## Сравнение методов

| Характеристика | Quadlet | Podman Compose |
|----------------|---------|----------------|
| Интеграция с systemd | ✅ Да | ❌ Нет |
| Автозапуск | ✅ Из коробки | ⚠️ Требует настройки |
| Мониторинг | ✅ systemctl/journalctl | ⚠️ podman-compose logs |
| Управление зависимостями | ✅ Автоматически | ⚠️ Вручную |
| Rootless режим | ✅ Да | ✅ Да |
| Production | ✅ Рекомендуется | ⚠️ Не рекомендуется |
| Разработка | ✅ Подходит | ✅ Подходит |
| Тестирование | ✅ Подходит | ✅ Подходит |

## Заключение

✅ **Quadlet + systemd — основной метод развёртывания**

✅ **Podman Compose — альтернатива для разработки**

✅ **Все Quadlet файлы настроены с labels для Traefik**

✅ **Документация обновлена**

✅ **Скрипты обновлены**

Проект готов к production-развёртыванию через Quadlet + systemd.

---

**Дата:** 2026-09-12  
**Статус:** ✅ Завершено  
**Основной метод:** Quadlet + systemd  
**Альтернатива:** Podman Compose
