# mumble-web-proxy: мост Mumble ⇄ WebSocket/WebRTC для браузера
# Используем Debian Bullseye с OpenSSL 1.1.1 для совместимости с openssl-sys@0.9.54

FROM rust:1.75-bullseye AS build

# Устанавливаем зависимости для компиляции
RUN apt-get update && apt-get install -y \
    git \
    pkg-config \
    libssl-dev \
    libopus-dev \
    libogg-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

# Клонируем и собираем
RUN git clone --depth 1 https://github.com/Johni0702/mumble-web-proxy.git . \
    && cargo build --release

# Финальный образ на основе Debian Bullseye slim
FROM debian:bullseye-slim

# Устанавливаем runtime зависимости
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    libopus0 \
    libogg0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /src/target/release/mumble-web-proxy /usr/local/bin/mumble-web-proxy

# 1337 — WebSocket (через nginx/Traefik на mumble-web)
# 64737 — UDP для WebRTC-медиа (пробрасывается напрямую)
EXPOSE 1337/tcp 64737/udp

CMD ["mumble-web-proxy"]
