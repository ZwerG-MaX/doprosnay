# Исправление ошибки "No such file or directory" для mumble-web-proxy

## Проблема

При запуске контейнера `rt-mumble-proxy` возникает ошибка:

```
{"msg":"exec container process (missing dynamic library?) `/usr/local/bin/mumble-web-proxy`: No such file or directory","level":"error","time":"2026-09-12T17:17:21.471672Z"}
```

## Причина

**Несовместимость glibc и musl libc:**

- **Этап 1 (builder):** Бинарник компилируется на `rust:1.89-bookworm` с **glibc**
- **Этап 2 (runtime):** Образ `alpine:3.19` использует **musl libc**
- Бинарник, скомпилированный с glibc, **не может запуститься** на Alpine с musl libc
- Ошибка "No such file or directory" означает, что динамический линкер не может найти glibc

## Решение

**Заменён Alpine на Debian slim для runtime:**

- **Этап 2 (runtime):** `debian:bookworm-slim` с **glibc**
- Бинарник, скомпилированный на Debian, **совместим** с Debian slim
- Размер образа увеличился с ~50-80 MB до ~100-150 MB, но это необходимо для совместимости

## Обновлённые файлы

### 1. `infra/mumble-web-proxy.Dockerfile`

**Было:**
```dockerfile
FROM alpine:3.19

RUN apk add --no-cache \
    libnice \
    glib \
    openssl \
    opus \
    libogg \
    ca-certificates
```

**Стало:**
```dockerfile
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libnice10 \
    libglib2.0-0 \
    libssl3 \
    libopus0 \
    libogg0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

### 2. `infra/mumble-web-proxy.Dockerfile.alternative`

**Было:**
```dockerfile
FROM alpine:3.19

RUN apk add --no-cache \
    wget \
    ca-certificates \
    libnice \
    glib \
    openssl \
    opus \
    libogg
```

**Стало:**
```dockerfile
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    libnice10 \
    libglib2.0-0 \
    libssl3 \
    libopus0 \
    libogg0 \
    && rm -rf /var/lib/apt/lists/*
```

### 3. Документация

- `infra/SOLUTION.md` - обновлены размеры и зависимости
- `README.md` - обновлены размеры и зависимости

## Пересборка образа

**Вариант 1: Multi-stage сборка (рекомендуется)**

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
# Время: ~5-10 минут
# Размер: ~100-150 MB
```

**Вариант 2: Готовый бинарник (быстро)**

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
# Время: ~1 минута
# Размер: ~100-150 MB
```

## Проверка

```bash
# Проверьте образ
podman images | grep rt-mumble-web-proxy

# Проверьте размер
podman images rt-mumble-web-proxy:latest --format "{{.Size}}"

# Удалите старый контейнер
podman rm -f rt-mumble-proxy

# Запустите новый контейнер
podman run -d --name rt-mumble-proxy \
  -p 1337:1337 -p 64737:64737/udp \
  rt-mumble-web-proxy:latest

# Проверьте логи
podman logs rt-mumble-proxy
```

## Почему не Alpine?

**Alpine Linux использует musl libc**, а не glibc:

- **glibc** (GNU C Library) - стандартная библиотека C для Linux, используется в Debian, Ubuntu, Fedora
- **musl libc** - легковесная альтернатива glibc, используется в Alpine Linux

**Проблема:**
- Бинарники, скомпилированные с glibc, **не совместимы** с musl libc
- Бинарники, скомпилированные с musl libc, **не совместимы** с glibc
- Для совместимости нужно использовать **тот же базовый образ** для builder и runtime

**Решения:**
1. **Использовать Debian slim для runtime** (выбрано) - простое и надёжное решение
2. **Компилировать статически** - сложно, требует специальных настроек
3. **Использовать musl для builder** - требует пересборки всех зависимостей

## Альтернативные решения

### Вариант 1: Статическая компиляция

Можно скомпилировать бинарник статически, чтобы он не зависел от динамических библиотек:

```dockerfile
# В builder
RUN cargo build --release --target x86_64-unknown-linux-musl
```

Но это требует:
- Установки musl toolchain
- Пересборки всех зависимостей с поддержкой musl
- Может не работать с некоторыми библиотеками (libnice, openssl)

### Вариант 2: Использовать musl для builder

```dockerfile
FROM rust:1.89-alpine AS builder
# ... компиляция на Alpine с musl

FROM alpine:3.19 AS runtime
# ... runtime на Alpine с musl
```

Но это требует:
- Пересборки всех зависимостей для musl
- Может не работать с некоторыми библиотеками

### Вариант 3: Использовать Debian slim для builder и runtime (выбрано)

```dockerfile
FROM rust:1.89-bookworm AS builder
# ... компиляция на Debian с glibc

FROM debian:bookworm-slim AS runtime
# ... runtime на Debian с glibc
```

**Преимущества:**
- Простое и надёжное решение
- Не требует пересборки зависимостей
- Совместимость с glibc

**Недостатки:**
- Размер образа больше (~100-150 MB вместо ~50-80 MB)

## Итог

**Проблема решена:**
- Заменён Alpine на Debian slim для runtime
- Бинарник теперь совместим с glibc
- Размер образа увеличился до ~100-150 MB, но это необходимо для совместимости

**Пересоберите образ:**
```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Проверьте:**
```bash
podman rm -f rt-mumble-proxy
podman run -d --name rt-mumble-proxy \
  -p 1337:1337 -p 64737:64737/udp \
  rt-mumble-web-proxy:latest
podman logs rt-mumble-proxy
```

Контейнер должен запуститься без ошибок.
