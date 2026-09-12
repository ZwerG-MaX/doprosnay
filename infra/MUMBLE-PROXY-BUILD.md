# Решение проблемы сборки mumble-web-proxy

## Проблема

При сборке `mumble-web-proxy` возникает ошибка:

```
error: failed to run custom build command for `openssl-sys v0.9.54`
...
cargo:warning=build/expando.c:4:24: error: pasting "RUST_VERSION_OPENSSL_" and "(" does not give a valid preprocessing token
```

## Причина

Проект `mumble-web-proxy` использует устаревшую версию `openssl-sys@0.9.54`, которая несовместима с OpenSSL 3.x (используется в Debian Bookworm и Ubuntu 22.04+).

Ошибка возникает из-за того, что `openssl-sys@0.9.54` пытается использовать макросы препроцессора, которые не работают с OpenSSL 3.x.

## Решения

### Решение 1: Использовать Debian Bullseye (рекомендуется)

Debian Bullseye использует OpenSSL 1.1.1, который совместим с `openssl-sys@0.9.54`.

**Dockerfile:**
```dockerfile
FROM rust:1.75-bullseye AS build

RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    libopus-dev \
    libogg-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

RUN git clone --depth 1 https://github.com/Johni0702/mumble-web-proxy.git . \
    && cargo build --release

FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
    libssl1.1 \
    libopus0 \
    libogg0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /src/target/release/mumble-web-proxy /usr/local/bin/mumble-web-proxy

EXPOSE 1337/tcp 64737/udp

CMD ["mumble-web-proxy"]
```

**Сборка:**
```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
# или
docker build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Время сборки:** ~5-10 минут

### Решение 2: Использовать готовый бинарник

Самый быстрый способ - использовать готовый бинарник из GitHub releases.

**Dockerfile:**
```dockerfile
FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    libssl1.1 \
    libopus0 \
    libogg0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN wget -q https://github.com/Johni0702/mumble-web-proxy/releases/download/v0.5.0/mumble-web-proxy \
    -O /usr/local/bin/mumble-web-proxy \
    && chmod +x /usr/local/bin/mumble-web-proxy

EXPOSE 1337/tcp 64737/udp

CMD ["mumble-web-proxy"]
```

**Сборка:**
```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

**Время сборки:** ~1 минута

### Решение 3: Автоматический скрипт сборки

Используйте скрипт `build-mumble-proxy.sh`:

```bash
cd infra/
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh
```

Скрипт предложит выбрать вариант сборки и выполнит все необходимые команды.

Для быстрой сборки готового бинарника:
```bash
./build-mumble-proxy.sh --quick
```

### Решение 4: Обновить зависимости mumble-web-proxy

Если вы готовы форкнуть проект, можно обновить `Cargo.toml`:

```toml
[dependencies]
openssl-sys = "0.9.102"  # или новее
```

Но это требует тестирования и может сломать другие зависимости.

## Проверка сборки

После сборки проверьте образ:

```bash
podman images | grep rt-mumble-web-proxy
# или
docker images | grep rt-mumble-web-proxy
```

Запустите контейнер для проверки:

```bash
podman run -d --name rt-mumble-proxy \
  -p 1337:1337 -p 64737:64737/udp \
  rt-mumble-web-proxy:latest

podman logs rt-mumble-proxy
```

## Интеграция с Quadlet

После успешной сборки обновите Quadlet-конфигурацию:

```bash
# Скопируйте container-файл
cp quadlet/rt-mumble-proxy.container ~/.config/containers/systemd/

# Перезагрузите systemd
systemctl --user daemon-reload

# Запустите сервис
systemctl --user start rt-mumble-proxy
```

## Альтернативы

Если сборка `mumble-web-proxy` вызывает слишком много проблем, рассмотрите альтернативы:

### 1. Использовать нативный Mumble-клиент

Отключите веб-интерфейс и используйте десктопный клиент Mumble:

```bash
# Отключите веб-сервисы
systemctl --user stop rt-mumble-web rt-mumble-proxy
systemctl --user disable rt-mumble-web rt-mumble-proxy
```

### 2. Использовать другой WebSocket-прокси

Существуют альтернативные реализации:
- [mumble-web](https://github.com/Rantanen/mumble-web) - веб-клиент с встроенным прокси
- [mumble-websocket](https://github.com/mumble-voip/mumble-websocket) - официальный WebSocket-модуль

### 3. Использовать Docker-образ из Docker Hub

Проверьте, есть ли готовые образы:

```bash
podman search mumble-web-proxy
# или
docker search mumble-web-proxy
```

## Дополнительные ресурсы

- [mumble-web-proxy GitHub](https://github.com/Johni0702/mumble-web-proxy)
- [openssl-sys документация](https://docs.rs/openssl-sys/latest/openssl_sys/)
- [Debian Bullseye release notes](https://www.debian.org/releases/bullseye/)
- [OpenSSL 1.1.1 vs 3.0](https://www.openssl.org/blog/blog/2021/09/16/Lets Encrypt)

## Диагностика

Для диагностики проблем используйте скрипт:

```bash
chmod +x quadlet/diagnose-mumble-proxy.sh
./quadlet/diagnose-mumble-proxy.sh
```

Скрипт проверит:
- Наличие Podman/Docker
- Статус контейнера
- Доступность портов
- Зависимости (rt-mumble, сеть)
