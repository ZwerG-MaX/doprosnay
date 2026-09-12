# Troubleshooting: mumble-web-proxy

## Проблема: Ошибка сборки openssl-sys

### Симптомы

При сборке образа `rt-mumble-web-proxy` возникает ошибка:

```
error: failed to run custom build command for `openssl-sys v0.9.54`
...
Failed to find OpenSSL development headers.
```

### Причина

1. Устаревший образ `rust:1-alpine` с старой версией Rust
2. Alpine Linux использует musl libc вместо glibc
3. openssl-sys@0.9.54 несовместим с современными версиями OpenSSL 3.x

### Решение 1: Использовать обновлённый Dockerfile (рекомендуется)

Обновлённый Dockerfile использует:
- `rust:1.75-bookworm` вместо `rust:1-alpine`
- Debian вместо Alpine (glibc вместо musl)
- Правильные зависимости для компиляции

```bash
# Пересоберите образ
podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/
```

**Время сборки:** 5-10 минут (первая сборка)

### Решение 2: Использовать готовый бинарник

Если компиляция занимает слишком много времени:

1. Скачайте готовый бинарник из [релизов mumble-web-proxy](https://github.com/Johni0702/mumble-web-proxy/releases)

2. Поместите бинарник в `infra/mumble-web-proxy`

3. Соберите образ:
```bash
podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile.alternative infra/
```

### Решение 3: Использовать Docker-образ из Docker Hub

Проверьте, есть ли готовый образ:

```bash
# Поиск образа
podman search mumble-web-proxy

# Если найден, используйте его
podman pull docker.io/johni0702/mumble-web-proxy:latest
```

Затем обновите `quadlet/rt-mumble-proxy.container`:

```ini
[Container]
Image=docker.io/johni0702/mumble-web-proxy:latest
# ... остальные настройки
```

### Решение 4: Пропустить mumble-web-proxy (если не нужен)

Если вам не нужна веб-консоль Mumble (используете нативный клиент), можно отключить сервис:

```bash
# Отключите сервис
systemctl --user disable rt-mumble-proxy

# Или удалите Quadlet-файл
rm ~/.config/containers/systemd/rt-mumble-proxy.container
systemctl --user daemon-reload
```

## Проверка работы mumble-web-proxy

После запуска проверьте:

```bash
# Проверьте статус контейнера
podman ps | grep rt-mumble-proxy

# Проверьте логи
podman logs -f rt-mumble-proxy

# Проверьте доступность порта
ss -tulpn | grep 64737
```

## Альтернативы mumble-web-proxy

### Вариант 1: Использовать только нативный Mumble-клиент

Отключите веб-интерфейс и используйте нативный клиент:

1. Установите Mumble клиент на рабочие станции
2. Подключайтесь к `mumble.local:64738`
3. Отключите `rt-mumble-web` и `rt-mumble-proxy` в Quadlet

### Вариант 2: Использовать Mumble-сервер с встроенным WebSocket

Некоторые форки Mumble имеют встроенную поддержку WebSocket:

- [Mumble-Web](https://github.com/Rantanen/mumble-web) (альтернативная реализация)
- [Murmur WebSocket patch](https://github.com/mumble-voip/mumble/pulls)

### Вариант 3: Использовать другой голосовой сервер

Если Mumble слишком сложен для развёртывания:

- **Jitsi Meet** — WebRTC, проще в развёртывании
- **Matrix + Element** — децентрализованный, с голосовыми звонками
- **Discord** (проприетарный) — если допустимо

## Оптимизация сборки

### Кэширование слоёв

Docker/Podman кэширует слои. Если сборка падает на этапе `cargo build`, попробуйте:

```bash
# Очистите кэш
podman system prune -a

# Пересоберите с нуля
podman build --no-cache -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/
```

### Параллельная компиляция

Ускорьте компиляцию, используя больше ядер:

```bash
# В Dockerfile добавьте:
ENV CARGO_BUILD_JOBS=4
```

### Использование buildx (Docker)

Если используете Docker вместо Podman:

```bash
docker buildx build \
  --platform linux/amd64 \
  -t rt-mumble-web-proxy:latest \
  -f infra/mumble-web-proxy.Dockerfile \
  infra/
```

## Дополнительные ресурсы

- [mumble-web-proxy GitHub](https://github.com/Johni0702/mumble-web-proxy)
- [Rust OpenSSL bindings](https://github.com/sfackler/rust-openssl)
- [Podman build troubleshooting](https://docs.podman.io/en/latest/markdown/podman-build.1.html)
