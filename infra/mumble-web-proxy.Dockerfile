# Multi-stage Dockerfile для mumble-web-proxy
# Этап 1: Компиляция из форка https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89
# Этап 2: Лёгкий Alpine образ для runtime

# ═══════════════════════════════════════════════════════════════
# ЭТАП 1: Сборка (используем зависимости из репозитория)
# ═══════════════════════════════════════════════════════════════
FROM rust:1.89-bookworm AS builder

# Нативные зависимости для компиляции (из README репозитория)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    clang \
    libclang-dev \
    libnice-dev \
    libglib2.0-dev \
    libssl-dev \
    libopus-dev \
    libogg-dev \
    ca-certificates \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Клонируем форк с обновлёнными зависимостями
RUN git clone --depth 1 https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89.git .

# Выполняем сборку (как в оригинальном Dockerfile репозитория)
RUN cargo build --workspace --release

# ═══════════════════════════════════════════════════════════════
# ЭТАП 2: Runtime (Debian slim для совместимости с glibc)
# ═══════════════════════════════════════════════════════════════
FROM debian:bookworm-slim

# Runtime зависимости (только библиотеки, без dev-пакетов)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnice10 \
    libglib2.0-0 \
    libssl3 \
    libopus0 \
    libogg0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Копируем скомпилированный бинарник из builder
COPY --from=builder /src/target/release/mumble-web-proxy /usr/local/bin/mumble-web-proxy

# Делаем бинарник исполняемым
RUN chmod +x /usr/local/bin/mumble-web-proxy

# 64737 — WebSocket для mumble-web
# 20000-21000 — UDP порты для WebRTC ICE
EXPOSE 64737/tcp 20000-21000/udp

# Запуск с обязательными параметрами:
# --listen-ws 64737 - порт для WebSocket
# --server rt-mumble:64738 - адрес Mumble сервера (имя контейнера в docker-compose)
# --ice-port-min/max - диапазон портов для WebRTC ICE
CMD ["mumble-web-proxy", "--listen-ws", "64737", "--server", "rt-mumble:64738", "--ice-port-min", "20000", "--ice-port-max", "21000"]
