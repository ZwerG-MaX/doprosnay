# mumble-web-proxy: мост Mumble (TCP/UDP) ⇄ WebSocket/WebRTC для браузера.
# Официального образа нет — собираем из исходников (Rust).
#
# Использование в compose:
#   build:
#     context: ./infra
#     dockerfile: mumble-web-proxy.Dockerfile

FROM rust:1-alpine AS build

RUN apk add --no-cache musl-dev git pkgconfig openssl-dev opus-dev libogg-dev

WORKDIR /src
RUN git clone --depth 1 https://github.com/Johni0702/mumble-web-proxy.git . \
    && cargo build --release

FROM alpine:3.20
RUN apk add --no-cache openssl opus libogg

COPY --from=build /src/target/release/mumble-web-proxy /usr/local/bin/mumble-web-proxy

# 1337  — WebSocket (через nginx/Traefik на mumble-web)
# 64737 — UDP для WebRTC-медиа (пробрасывается напрямую)
EXPOSE 1337/tcp 64737/udp

CMD ["mumble-web-proxy"]
