# Настройка mumble-web-proxy

## Проблема

При запуске контейнера mumble-web-proxy возникает ошибка:
```
mumble-web-proxy: Option ["--listen-ws"] is required
```

## Причина

mumble-web-proxy требует обязательные параметры командной строки:
- `--listen-ws <port>` — порт для WebSocket сервера
- `--server <host:port>` — адрес Mumble сервера

## Решение

### Обновлённые Dockerfile

Оба Dockerfile обновлены с правильными параметрами:

**`infra/mumble-web-proxy.Dockerfile`:**
```dockerfile
EXPOSE 64737/tcp 20000-21000/udp

CMD ["mumble-web-proxy", "--listen-ws", "64737", "--server", "rt-mumble:64738", "--ice-port-min", "20000", "--ice-port-max", "21000"]
```

**`infra/mumble-web-proxy.Dockerfile.alternative`:**
```dockerfile
EXPOSE 64737/tcp 20000-21000/udp

CMD ["mumble-web-proxy", "--listen-ws", "64737", "--server", "rt-mumble:64738", "--ice-port-min", "20000", "--ice-port-max", "21000"]
```

### Параметры mumble-web-proxy

**Обязательные параметры:**
- `--listen-ws 64737` — порт для WebSocket сервера (для mumble-web)
- `--server rt-mumble:64738` — адрес Mumble сервера (имя контейнера в docker-compose)

**Опциональные параметры:**
- `--ice-port-min 20000` — минимальный порт для WebRTC ICE
- `--ice-port-max 21000` — максимальный порт для WebRTC ICE
- `--ice-ipv4 <ip>` — публичный IPv4 адрес (для NAT)
- `--ice-ipv6 <ip>` — публичный IPv6 адрес (для NAT)
- `--config <file>` — путь к конфигурационному файлу TOML

### Обновлённые конфигурации

**docker-compose.yml:**
```yaml
mumble-web-proxy:
  build:
    context: ./infra
    dockerfile: mumble-web-proxy.Dockerfile
  container_name: rt-mumble-proxy
  depends_on:
    - mumble
  ports:
    - "64737:64737/tcp"      # WebSocket для mumble-web
    - "20000-21000:20000-21000/udp"  # WebRTC ICE
  restart: unless-stopped
```

**quadlet/rt-mumble-proxy.container:**
```ini
[Container]
Image=rt-mumble-web-proxy:latest
Network=rt-dopros-net.network
PublishPort=64737:64737/tcp
PublishPort=20000-21000:20000-21000/udp
```

## Пересборка образа

После обновления Dockerfile нужно пересобрать образ:

```bash
cd infra/

# Вариант 1: Multi-stage сборка (рекомендуется)
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .

# Вариант 2: Готовый бинарник (быстро)
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

## Перезапуск контейнера

### Для docker-compose:

```bash
# Остановить и удалить старый контейнер
docker compose stop mumble-web-proxy
docker compose rm -f mumble-web-proxy

# Пересобрать образ
docker compose build mumble-web-proxy

# Запустить заново
docker compose up -d mumble-web-proxy

# Проверить логи
docker compose logs -f mumble-web-proxy
```

### Для Quadlet:

```bash
# Остановить и удалить старый контейнер
podman stop rt-mumble-proxy
podman rm rt-mumble-proxy

# Пересобрать образ
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .

# Обновить Quadlet конфигурацию
cp quadlet/rt-mumble-proxy.container ~/.config/containers/systemd/
systemctl --user daemon-reload

# Запустить заново
systemctl --user restart rt-mumble-proxy

# Проверить логи
podman logs -f rt-mumble-proxy
```

## Проверка работы

```bash
# Проверьте логи
podman logs rt-mumble-proxy

# Должно быть что-то вроде:
# Listening on 0.0.0.0:64737
# Connecting to Mumble server at rt-mumble:64738

# Проверьте порты
podman port rt-mumble-proxy

# Должно быть:
# 64737/tcp -> 0.0.0.0:64737
# 20000-21000/udp -> 0.0.0.0:20000-21000
```

## Настройка для NAT

Если mumble-web-proxy работает за NAT, нужно указать публичные IP адреса:

```dockerfile
CMD ["mumble-web-proxy", \
     "--listen-ws", "64737", \
     "--server", "rt-mumble:64738", \
     "--ice-port-min", "20000", \
     "--ice-port-max", "21000", \
     "--ice-ipv4", "YOUR_PUBLIC_IP", \
     "--ice-ipv6", "YOUR_PUBLIC_IPV6"]
```

## Конфигурационный файл

Вместо передачи всех параметров в командной строке, можно использовать TOML файл:

**config.toml:**
```toml
listen-ws = 64737
server = 'rt-mumble:64738'
ice-port-min = 20000
ice-port-max = 21000
# ice-ipv4 = 'YOUR_PUBLIC_IP'
# ice-ipv6 = 'YOUR_PUBLIC_IPV6'
```

**Dockerfile:**
```dockerfile
COPY config.toml /etc/mumble-web-proxy/config.toml
CMD ["mumble-web-proxy", "--config", "/etc/mumble-web-proxy/config.toml"]
```

## Порты

**64737/tcp** — WebSocket для mumble-web
- mumble-web подключается к этому порту через WebSocket
- Используется для управления (контрольные сообщения)

**20000-21000/udp** — WebRTC ICE
- Используется для передачи голосовых данных через WebRTC
- Диапазон портов необходим для ICE connection establishment
- Если UDP недоступен, mumble-web автоматически работает по WebSocket

## Документация

- [Официальная документация mumble-web-proxy](https://github.com/Johni0702/mumble-web-proxy)
- [Форк с обновлёнными зависимостями](https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89)
- [mumble-web](https://github.com/Johni0702/mumble-web)

## Итог

Проблема решена:
- Обновлены Dockerfile с правильными параметрами
- Обновлены docker-compose.yml и quadlet конфигурации
- Исправлены порты (TCP для WebSocket, UDP для ICE)
- Создана документация по настройке

Пересоберите образ и перезапустите контейнер.
