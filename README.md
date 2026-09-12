# Пульт наблюдения «Допросная» — СКИТ

Веб-пульт для комнаты наблюдения с интеграцией видеостены MACROSCOP, аудиоканала Mumble и совместного редактирования протоколов в ONLYOFFICE Docs.

## Технологии

- **Frontend**: React 18 + TypeScript + Vite 6 + Tailwind CSS 4
- **Backend**: PostgreSQL 16 + PostgREST
- **Документы**: ONLYOFFICE Document Server
- **Видео**: MediaMTX (RTSP → WebRTC/HLS)
- **Аудио**: Mumble + mumble-web-proxy
- **Хранилище**: Nextcloud
- **Reverse Proxy**: Traefik

## Быстрый старт

### Локальная разработка

```bash
npm install
npm run dev          # http://localhost:5173
```

### Сборка Docker-образа mumble-web-proxy

Используем форк с обновлёнными зависимостями: **https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89**

**Multi-stage Dockerfile:**
- **Этап 1 (builder):** Компиляция из форка с использованием зависимостей из репозитория
  - Образ: `rust:1.89-bookworm`
  - Нативные зависимости: `build-essential`, `pkg-config`, `clang`, `libclang-dev`, `libnice-dev`, `libglib2.0-dev`, `libssl-dev`
  - Команда сборки: `cargo build --workspace --release`
- **Этап 2 (runtime):** Debian slim образ для runtime (~100-150 MB, совместимость с glibc)
  - Образ: `debian:bookworm-slim`
  - Runtime зависимости: `libnice10`, `libglib2.0-0`, `libssl3`, `libopus0`, `libogg0`
  - Копируется только бинарник из builder

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
# или
docker build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Время сборки:** ~5-10 минут  
**Размер финального образа:** ~100-150 MB

**Преимущества:**
- ✅ Совместимость с OpenSSL 3.x (Debian Bookworm, Ubuntu 22.04+)
- ✅ Rust 1.89 с новыми функциями
- ✅ Обновлённые зависимости
- ✅ Debian slim образ для runtime (совместимость с glibc)
- ✅ Использует Dockerfile из репозитория для компиляции
- ✅ Минимальный размер финального образа

### Проверка сборки

```bash
# Проверьте образ
podman images | grep rt-mumble-web-proxy

# Проверьте размер образа
podman images rt-mumble-web-proxy:latest --format "{{.Size}}"

# Запустите контейнер
podman run -d --name rt-mumble-proxy \
  -p 64737:64737/tcp \
  -p 20000-21000:20000-21000/udp \
  rt-mumble-web-proxy:latest

# Проверьте логи
podman logs rt-mumble-proxy

# Должно быть:
# Listening on 0.0.0.0:64737
# Connecting to Mumble server at rt-mumble:64738
```

### Параметры mumble-web-proxy

Dockerfile уже содержит необходимые параметры:
- `--listen-ws 64737` — порт для WebSocket сервера
- `--server rt-mumble:64738` — адрес Mumble сервера
- `--ice-port-min 20000` — минимальный порт для WebRTC ICE
- `--ice-port-max 21000` — максимальный порт для WebRTC ICE

Подробная документация: [infra/MUMBLE-PROXY-SETUP.md](infra/MUMBLE-PROXY-SETUP.md)

## Решение проблемы сборки

Если возникает ошибка с `openssl-sys`:

```
error: failed to run custom build command for `openssl-sys v0.9.54`
```

**Решение:** Используйте форк с обновлёнными зависимостями (уже настроен в `infra/mumble-web-proxy.Dockerfile`).

Подробная документация: [infra/FINAL-SOLUTION.md](infra/FINAL-SOLUTION.md)

## Альтернативные варианты сборки

### Вариант 1: Готовый бинарник (быстро)

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

**Время сборки:** ~1 минута  
**Размер финального образа:** ~100-150 MB

### Вариант 2: Автоматический скрипт

```bash
cd infra/
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh
```

Для быстрой сборки:
```bash
./build-mumble-proxy.sh --quick
```

## Миграция на Podman

Проект полностью переведён на **Podman**. Docker и docker-compose больше не поддерживаются.

Подробная документация: [PODMAN-MIGRATION.md](PODMAN-MIGRATION.md)

### Вариант 3: Пропустить mumble-web-proxy

Если не нужен веб-интерфейс Mumble:

```bash
# Удалите container-файлы
rm quadlet/rt-mumble-proxy.container
rm quadlet/rt-mumble-web.container
systemctl --user daemon-reload
```

## Развёртывание через Podman Quadlet (основной метод)

**Рекомендуется для production-развёртывания** с автозапуском и интеграцией с systemd.

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

# Просмотр логов
journalctl --user -u rt-dopros.target -f
```

**Преимущества Quadlet:**
- ✅ Интеграция с systemd
- ✅ Автозапуск при загрузке системы
- ✅ Rootless режим (без root-прав)
- ✅ Мониторинг через `systemctl` и `journalctl`
- ✅ Управление зависимостями между сервисами

Подробная документация: [QUADLET.md](QUADLET.md), [QUADLET-README.md](QUADLET-README.md)

## Развёртывание через Podman Compose (альтернатива)

Для быстрого тестирования или разработки:

```bash
# Установите podman-compose
pip install podman-compose

# Запуск стека
podman-compose up -d --build

# Проверка статуса
podman-compose ps

# Просмотр логов
podman-compose logs -f

# Остановка стека
podman-compose down
```

## Структура проекта

```
.
├── src/                    # Frontend код
│   ├── App.tsx            # Главный компонент
│   ├── main.tsx           # Точка входа
│   └── index.css          # Стили
├── infra/                  # Инфраструктура
│   ├── mumble-web-proxy.Dockerfile  # Multi-stage Dockerfile
│   ├── mumble-web-proxy.Dockerfile.alternative  # Готовый бинарник
│   ├── build-mumble-proxy.sh  # Скрипт сборки
│   ├── SOLUTION.md        # Решение проблемы сборки
│   ├── FINAL-SOLUTION.md  # Полная документация
│   └── db/                # Инициализация БД
├── quadlet/                # Quadlet-конфигурация для systemd
├── package.json
├── vite.config.js
└── README.md
```

## Документация

- [infra/FINAL-SOLUTION.md](infra/FINAL-SOLUTION.md) - полная документация по решению проблемы сборки
- [infra/SOLUTION.md](infra/SOLUTION.md) - краткое описание решения
- [Форк mumble-web-proxy](https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89) - исходный код форка

## Лицензия

Проект разработан для внутренних нужд.
