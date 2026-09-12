# Развёртывание через Podman Quadlet (systemd)

## Быстрый старт

### 1. Установка Quadlet-конфигурации

```bash
chmod +x quadlet/install-quadlet.sh
./quadlet/install-quadlet.sh install
```

Скрипт автоматически:
- Проверит Podman 4.0+
- Скопирует Quadlet-файлы в `~/.config/containers/systemd/`
- Скопирует конфигурацию в `~/.config/rt-dopros/`
- Обновит пути в container-файлах
- Соберёт Docker-образы (включая mumble-web-proxy)
- Перезагрузит systemd

### 2. Запуск стека

```bash
# Запустить все сервисы
systemctl --user start rt-dopros.target

# Проверить статус
systemctl --user status rt-dopros.target

# Включить автозапуск
systemctl --user enable rt-dopros.target
```

### 3. Доступ к сервисам

После запуска сервисы доступны на следующих портах:

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

## Проблемы со сборкой mumble-web-proxy

### Проблема

При сборке `mumble-web-proxy` может возникнуть ошибка:

```
error: failed to run custom build command for `openssl-sys v0.9.54`
cargo:warning=build/expando.c:4:24: error: pasting "RUST_VERSION_OPENSSL_" and "(" does not give a valid preprocessing token
```

### Причина

Проект `mumble-web-proxy` использует устаревшую версию `openssl-sys@0.9.54`, которая несовместима с OpenSSL 3.x (используется в Debian Bookworm и Ubuntu 22.04+).

### Решение

**Вариант 1: Использовать Debian Bullseye (рекомендуется)**

Обновлённый Dockerfile использует Debian Bullseye с OpenSSL 1.1.1:

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Время сборки:** ~5-10 минут

**Вариант 2: Использовать готовый бинарник (быстро)**

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

**Время сборки:** ~1 минута

**Вариант 3: Автоматический скрипт**

```bash
cd infra/
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh
```

Для быстрой сборки:
```bash
./build-mumble-proxy.sh --quick
```

**Вариант 4: Пропустить mumble-web-proxy**

Если вам не нужен веб-интерфейс Mumble (используете нативный клиент):

```bash
rm ~/.config/containers/systemd/rt-mumble-proxy.container
rm ~/.config/containers/systemd/rt-mumble-web.container
systemctl --user daemon-reload
```

**Вариант 5: Автоматический выбор при установке**

Скрипт `install-quadlet.sh` теперь предлагает выбрать вариант сборки:

```bash
./quadlet/install-quadlet.sh install
# Скрипт предложит выбрать вариант сборки mumble-web-proxy
```

### Подробная документация

См. [MUMBLE-PROXY-BUILD.md](infra/MUMBLE-PROXY-BUILD.md) для детального описания проблемы и решений.

### Подробная документация

См. [MUMBLE-PROXY-BUILD.md](infra/MUMBLE-PROXY-BUILD.md) для детального описания проблемы и решений.

## Управление сервисами

```bash
# Остановить все сервисы
systemctl --user stop rt-dopros.target

# Перезапустить все сервисы
systemctl --user restart rt-dopros.target

# Перезапустить отдельный сервис
systemctl --user restart rt-db

# Посмотреть статус отдельного сервиса
systemctl --user status rt-docs

# Отключить автозапуск
systemctl --user disable rt-dopros.target
```

## Диагностика

### Статус всех сервисов

```bash
./quadlet/install-quadlet.sh status
```

### Логи контейнера

```bash
podman logs -f rt-db
```

### Вход в контейнер

```bash
podman exec -it rt-db sh
```

### Диагностика mumble-web-proxy

```bash
chmod +x quadlet/diagnose-mumble-proxy.sh
./quadlet/diagnose-mumble-proxy.sh
```

## Удаление

```bash
# Автоматическое удаление
./quadlet/install-quadlet.sh uninstall

# Или вручную
systemctl --user stop rt-dopros.target
systemctl --user disable rt-dopros.target
rm ~/.config/containers/systemd/rt-*.{network,volume,container,target}
systemctl --user daemon-reload
```

## Решение проблем

### Podman socket не активен

```bash
systemctl --user enable --now podman.socket
```

### Контейнер не запускается

```bash
# Проверить логи
journalctl --user -u rt-db.service -n 50

# Проверить конфигурацию
systemctl --user cat rt-db.service

# Перезапустить systemd
systemctl --user daemon-reload
```

### Образы не собраны

```bash
# Собрать вручную
podman build -t rt-pult:latest -f Dockerfile .
podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/
```

### Ошибка сборки mumble-web-proxy (openssl-sys)

См. раздел "Проблемы со сборкой mumble-web-proxy" выше или [MUMBLE-PROXY-BUILD.md](infra/MUMBLE-PROXY-BUILD.md).

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

- [QUADLET.md](QUADLET.md) - полная документация по Quadlet
- [PRODUCTION.md](quadlet/PRODUCTION.md) - production-конфигурация с HTTPS
- [TROUBLESHOOTING.md](quadlet/TROUBLESHOOTING.md) - общее руководство по устранению неполадок
- [MUMBLE-PROXY-BUILD.md](infra/MUMBLE-PROXY-BUILD.md) - детальная документация по сборке mumble-web-proxy
