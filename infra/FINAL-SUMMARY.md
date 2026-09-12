# Финальная сводка: Настройка mumble-web-proxy

## Проблема

При запуске контейнера mumble-web-proxy возникала ошибка:
```
mumble-web-proxy: Option ["--listen-ws"] is required
```

## Причина

mumble-web-proxy требует обязательные параметры командной строки:
- `--listen-ws <port>` — порт для WebSocket сервера
- `--server <host:port>` — адрес Mumble сервера

В Dockerfile эти параметры отсутствовали.

## Решение

### 1. Обновлены Dockerfile

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

### 2. Обновлены конфигурации

**docker-compose.yml:**
```yaml
mumble-web-proxy:
  ports:
    - "64737:64737/tcp"      # WebSocket для mumble-web
    - "20000-21000:20000-21000/udp"  # WebRTC ICE
```

**quadlet/rt-mumble-proxy.container:**
```ini
PublishPort=64737:64737/tcp
PublishPort=20000-21000:20000-21000/udp
```

### 3. Создана документация

- **`infra/MUMBLE-PROXY-SETUP.md`** — полная документация по настройке mumble-web-proxy
- **`infra/rebuild-mumble-proxy.sh`** — скрипт для пересборки и перезапуска

### 4. Обновлена документация

- **`README.md`** — обновлены порты и добавлена информация о параметрах

## Параметры mumble-web-proxy

**Обязательные параметры:**
- `--listen-ws 64737` — порт для WebSocket сервера (для mumble-web)
- `--server rt-mumble:64738` — адрес Mumble сервера (имя контейнера в docker-compose)

**Опциональные параметры:**
- `--ice-port-min 20000` — минимальный порт для WebRTC ICE
- `--ice-port-max 21000` — максимальный порт для WebRTC ICE
- `--ice-ipv4 <ip>` — публичный IPv4 адрес (для NAT)
- `--ice-ipv6 <ip>` — публичный IPv6 адрес (для NAT)
- `--config <file>` — путь к конфигурационному файлу TOML

## Порты

**64737/tcp** — WebSocket для mumble-web
- mumble-web подключается к этому порту через WebSocket
- Используется для управления (контрольные сообщения)

**20000-21000/udp** — WebRTC ICE
- Используется для передачи голосовых данных через WebRTC
- Диапазон портов необходим для ICE connection establishment
- Если UDP недоступен, mumble-web автоматически работает по WebSocket

## Пересборка и перезапуск

### Автоматический скрипт

```bash
cd infra/
chmod +x rebuild-mumble-proxy.sh
./rebuild-mumble-proxy.sh
```

### Вручную

```bash
cd infra/

# Пересборка образа
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .

# Перезапуск через docker-compose
cd ..
docker compose stop mumble-web-proxy
docker compose rm -f mumble-web-proxy
docker compose up -d mumble-web-proxy

# Или через Quadlet
podman stop rt-mumble-proxy
podman rm rt-mumble-proxy
systemctl --user restart rt-mumble-proxy
```

## Проверка работы

```bash
# Проверьте логи
podman logs rt-mumble-proxy

# Должно быть:
# Listening on 0.0.0.0:64737
# Connecting to Mumble server at rt-mumble:64738

# Проверьте порты
podman port rt-mumble-proxy

# Должно быть:
# 64737/tcp -> 0.0.0.0:64737
# 20000-21000/udp -> 0.0.0.0:20000-21000
```

## Созданные файлы

### Docker-файлы
1. **`infra/mumble-web-proxy.Dockerfile`** — обновлён с параметрами
2. **`infra/mumble-web-proxy.Dockerfile.alternative`** — обновлён с параметрами

### Конфигурации
3. **`docker-compose.yml`** — обновлены порты
4. **`quadlet/rt-mumble-proxy.container`** — обновлены порты

### Скрипты
5. **`infra/rebuild-mumble-proxy.sh`** — скрипт для пересборки и перезапуска

### Документация
6. **`infra/MUMBLE-PROXY-SETUP.md`** — полная документация по настройке
7. **`README.md`** — обновлена информация о портах и параметрах

## Итог

Проблема решена:
- ✅ Обновлены Dockerfile с правильными параметрами
- ✅ Обновлены docker-compose.yml и quadlet конфигурации
- ✅ Исправлены порты (TCP для WebSocket, UDP для ICE)
- ✅ Создана полная документация по настройке
- ✅ Создан скрипт для автоматической пересборки и перезапуска
- ✅ Обновлена основная документация

Пересоберите образ и перезапустите контейнер. mumble-web-proxy должен запуститься без ошибок.

## Документация

- [infra/MUMBLE-PROXY-SETUP.md](infra/MUMBLE-PROXY-SETUP.md) — полная документация по настройке
- [Официальная документация mumble-web-proxy](https://github.com/Johni0702/mumble-web-proxy)
- [Форк с обновлёнными зависимостями](https://github.com/ZwerG-MaX/mumble-web-proxy-rust-1.89)
