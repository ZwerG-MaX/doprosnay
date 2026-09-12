# Исправление ошибки сборки: libnice0 не найден

## Проблема

При сборке Docker-образа возникает ошибка:

```
Reading state information...
E: Unable to locate package libnice0
Error: building at STEP "RUN apt-get update && apt-get install -y --no-install-recommends     libnice0     libglib2.0-0     libssl3     libopus0     libogg0     ca-certificates     && rm -rf /var/lib/apt/lists/*": while running runtime: exit status 100
```

## Причина

**Неправильное имя пакета в Debian Bookworm:**

- В Alpine Linux пакет называется `libnice`
- В Debian Bookworm пакет называется `libnice10` (не `libnice0`)
- `libnice0` - это старое имя пакета из предыдущих версий Debian

## Решение

**Заменено `libnice0` на `libnice10` во всех Dockerfile:**

### Обновлённые файлы

1. **`infra/mumble-web-proxy.Dockerfile`**
   - Строка 24: `libnice0` → `libnice10`

2. **`infra/mumble-web-proxy.Dockerfile.alternative`**
   - Строка 11: `libnice0` → `libnice10`
   - Строка 21: URL бинарника обновлён на форк

3. **Документация**
   - `infra/SOLUTION.md` - обновлены зависимости
   - `README.md` - обновлены зависимости
   - `infra/FIX-GLIBC-MUSL.md` - обновлены зависимости
   - `SUMMARY.md` - обновлены зависимости

## Правильные зависимости для Debian Bookworm

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnice10 \
    libglib2.0-0 \
    libssl3 \
    libopus0 \
    libogg0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
```

## Альтернативный Dockerfile с готовым бинарником

Обновлён URL для загрузки готового бинарника из форка:

```dockerfile
# Скачиваем готовый бинарник из форка
RUN wget -q https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89/releases/download/untagged-d7079c08d2d466eb476d/mumble-web-proxy \
    -O /usr/local/bin/mumble-web-proxy \
    && chmod +x /usr/local/bin/mumble-web-proxy
```

## Пересборка образа

После исправления пересоберите образ:

```bash
cd infra/

# Вариант 1: Multi-stage сборка (рекомендуется)
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .

# Вариант 2: Готовый бинарник (быстро)
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

## Проверка

```bash
# Проверьте образ
podman images | grep rt-mumble-web-proxy

# Запустите контейнер
podman run -d --name rt-mumble-proxy \
  -p 1337:1337 -p 64737:64737/udp \
  rt-mumble-web-proxy:latest

# Проверьте логи
podman logs rt-mumble-proxy
```

## Сравнение имён пакетов

| Библиотека | Alpine Linux | Debian Bookworm |
|------------|--------------|-----------------|
| libnice    | `libnice`    | `libnice10`     |
| glib       | `glib`       | `libglib2.0-0`  |
| openssl    | `openssl`    | `libssl3`       |
| opus       | `opus`       | `libopus0`      |
| libogg     | `libogg`     | `libogg0`       |

## Итог

**Проблема решена:**
- Заменено `libnice0` на `libnice10` во всех Dockerfile
- Обновлён URL для готового бинарника в альтернативном Dockerfile
- Обновлена вся документация

**Пересоберите образ:**
```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

Сборка должна пройти успешно.
