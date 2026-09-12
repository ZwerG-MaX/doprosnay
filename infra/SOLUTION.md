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

## Решение: Использование форка с обновлёнными зависимостями

Используем форк **https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89** с:
- Обновлёнными зависимостями (совместимыми с OpenSSL 3.x)
- Rust 1.89
- Исправленными проблемами совместимости

### Сборка из форка (Multi-stage Dockerfile)

**Dockerfile:** `infra/mumble-web-proxy.Dockerfile`

Используем multi-stage сборку:
- **Этап 1 (builder):** Компиляция из форка с использованием зависимостей из репозитория
  - Образ: `rust:1.89-bookworm`
  - Нативные зависимости из README репозитория: `build-essential`, `pkg-config`, `clang`, `libclang-dev`, `libnice-dev`, `libglib2.0-dev`, `libssl-dev`
  - Команда сборки: `cargo build --workspace --release`
- **Этап 2 (runtime):** Debian slim образ для runtime (~100-150 MB, совместимость с glibc)
  - Образ: `debian:bookworm-slim`
  - Runtime зависимости: `libnice10`, `libglib2.0-0`, `libssl3`, `libopus0`, `libogg0`
  - Копируется только бинарник из builder

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Время сборки:** ~5-10 минут

**Преимущества:**
- ✅ Совместимость с OpenSSL 3.x (Debian Bookworm, Ubuntu 22.04+)
- ✅ Rust 1.89 с новыми функциями
- ✅ Обновлённые зависимости
- ✅ Debian slim образ для runtime (~100-150 MB, совместимость с glibc)
- ✅ Использует Dockerfile из репозитория для компиляции
- ✅ Минимальный размер финального образа

### Альтернативные варианты

#### Вариант 1: Готовый бинарник (самый быстрый)

Если не хотите собирать из исходников:

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

**Время сборки:** ~1 минута

#### Вариант 2: Автоматический скрипт

```bash
cd infra/
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh
```

#### Вариант 3: Пропустить mumble-web-proxy

Если не нужен веб-интерфейс Mumble:

```bash
rm ~/.config/containers/systemd/rt-mumble-proxy.container
rm ~/.config/containers/systemd/rt-mumble-web.container
systemctl --user daemon-reload
```

## Проверка сборки

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

## Интеграция с Quadlet

После успешной сборки:

```bash
# Скопируйте container-файл
cp quadlet/rt-mumble-proxy.container ~/.config/containers/systemd/

# Перезагрузите systemd
systemctl --user daemon-reload

# Запустите сервис
systemctl --user start rt-mumble-proxy
```

## Диагностика

```bash
chmod +x quadlet/diagnose-mumble-proxy.sh
./quadlet/diagnose-mumble-proxy.sh
```

## Дополнительные ресурсы

- [Форк mumble-web-proxy-rust-1.89](https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89)
- [Оригинальный mumble-web-proxy](https://github.com/Johni0702/mumble-web-proxy)
- [Документация по сборке](MUMBLE-PROXY-BUILD.md)
