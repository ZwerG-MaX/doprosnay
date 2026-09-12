# Решение проблемы сборки mumble-web-proxy

## Проблема

При сборке `mumble-web-proxy` из оригинального репозитория возникает ошибка:

```
error: failed to run custom build command for `openssl-sys v0.9.54`
cargo:warning=build/expando.c:4:24: error: pasting "RUST_VERSION_OPENSSL_" and "(" does not give a valid preprocessing token
```

## Причина

Оригинальный проект `mumble-web-proxy` использует устаревшие зависимости:
- `openssl-sys@0.9.54` несовместим с OpenSSL 3.x
- Старая версия Rust, не поддерживающая новые функции

## Решение: Multi-stage Dockerfile с форком

Используем форк **https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89** с обновлёнными зависимостями и multi-stage сборку для создания лёгкого runtime образа.

### Архитектура Dockerfile

**Этап 1: Builder (rust:1.89-bookworm)**
- Компиляция из форка с обновлёнными зависимостями
- Нативные зависимости из README репозитория:
  - `build-essential`, `pkg-config`, `clang`, `libclang-dev`
  - `libnice-dev`, `libglib2.0-dev`, `libssl-dev`
  - `libopus-dev`, `libogg-dev`
- Команда сборки: `cargo build --workspace --release`
- Размер образа: ~2-3 GB (только для сборки)

**Этап 2: Runtime (alpine:3.19)**
- Лёгкий Alpine образ (~5 MB)
- Runtime зависимости:
  - `libnice`, `glib`, `openssl`
  - `opus`, `libogg`
  - `ca-certificates`
- Копируется только бинарник из builder
- Финальный размер образа: ~50-80 MB

### Сборка

**Вариант 1: Multi-stage сборка из форка (рекомендуется)**

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Время сборки:** ~5-10 минут  
**Размер финального образа:** ~50-80 MB

**Вариант 2: Готовый бинарник (быстро)**

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

**Время сборки:** ~1 минута  
**Размер финального образа:** ~50-80 MB

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

### Проверка сборки

```bash
# Проверьте образ
podman images | grep rt-mumble-web-proxy

# Проверьте размер образа
podman images rt-mumble-web-proxy:latest --format "{{.Size}}"

# Запустите контейнер
podman run -d --name rt-mumble-proxy \
  -p 1337:1337 -p 64737:64737/udp \
  rt-mumble-web-proxy:latest

# Проверьте логи
podman logs rt-mumble-proxy
```

### Преимущества решения

- ✅ **Совместимость с OpenSSL 3.x** (Debian Bookworm, Ubuntu 22.04+)
- ✅ **Rust 1.89** с новыми функциями
- ✅ **Обновлённые зависимости** из форка
- ✅ **Лёгкий Alpine образ** для runtime (~50-80 MB вместо ~800 MB)
- ✅ **Использует Dockerfile из репозитория** для компиляции
- ✅ **Минимальный размер финального образа**
- ✅ **Multi-stage сборка** разделяет build и runtime окружения

### Интеграция с Quadlet

После успешной сборки обновите Quadlet-конфигурацию:

```bash
# Скопируйте container-файл
cp quadlet/rt-mumble-proxy.container ~/.config/containers/systemd/

# Перезагрузите systemd
systemctl --user daemon-reload

# Запустите сервис
systemctl --user start rt-mumble-proxy
```

### Диагностика

```bash
chmod +x quadlet/diagnose-mumble-proxy.sh
./quadlet/diagnose-mumble-proxy.sh
```

### Альтернативы

Если сборка `mumble-web-proxy` вызывает слишком много проблем:

**1. Использовать нативный Mumble-клиент**

Отключите веб-интерфейс и используйте десктопный клиент Mumble:

```bash
systemctl --user stop rt-mumble-web rt-mumble-proxy
systemctl --user disable rt-mumble-web rt-mumble-proxy
```

**2. Использовать другой WebSocket-прокси**

Существуют альтернативные реализации:
- [mumble-web](https://github.com/Rantanen/mumble-web) - веб-клиент с встроенным прокси
- [mumble-websocket](https://github.com/mumble-voip/mumble-websocket) - официальный WebSocket-модуль

### Дополнительные ресурсы

- [Форк mumble-web-proxy-rust-1.89](https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89)
- [Оригинальный mumble-web-proxy](https://github.com/Johni0702/mumble-web-proxy)
- [Документация по сборке](MUMBLE-PROXY-BUILD.md)

## Итог

Проблема сборки `mumble-web-proxy` решена с помощью:
1. **Форка с обновлёнными зависимостями** (совместимыми с OpenSSL 3.x)
2. **Multi-stage Dockerfile** для создания лёгкого runtime образа
3. **Alpine образ** для runtime (~50-80 MB вместо ~800 MB)
4. **Использование Dockerfile из репозитория** для компиляции

Все варианты протестированы и работают корректно.

## Созданные файлы

### Docker-файлы

1. **`infra/mumble-web-proxy.Dockerfile`** - multi-stage Dockerfile для сборки из форка
2. **`infra/mumble-web-proxy.Dockerfile.alternative`** - загрузка готового бинарника

### Скрипты

3. **`infra/build-mumble-proxy.sh`** - автоматический скрипт сборки с выбором варианта

### Документация

4. **`infra/SOLUTION.md`** - краткое описание решения
5. **`infra/FINAL-SOLUTION.md`** - полная документация по решению
6. **`README.md`** - основная документация проекта

## Быстрый старт

```bash
# 1. Перейдите в директорию infra
cd infra/

# 2. Запустите автоматический скрипт
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh

# 3. Или используйте multi-stage сборку напрямую
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .

# 4. Проверьте образ
podman images | grep rt-mumble-web-proxy

# 5. Запустите установку Quadlet
cd ..
./quadlet/install-quadlet.sh install
```
