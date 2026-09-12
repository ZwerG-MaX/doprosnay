# Быстрое решение проблемы сборки mumble-web-proxy

## Проблема

```
error: failed to run custom build command for `openssl-sys v0.9.54`
cargo:warning=build/expando.c:4:24: error: pasting "RUST_VERSION_OPENSSL_" and "(" does not give a valid preprocessing token
```

## Причина

`openssl-sys@0.9.54` несовместим с OpenSSL 3.x (Debian Bookworm, Ubuntu 22.04+).

## Быстрое решение (выберите один вариант)

### Вариант 1: Debian Bullseye (рекомендуется)

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Время:** ~5-10 минут  
**Почему работает:** Debian Bullseye использует OpenSSL 1.1.1

### Вариант 2: Готовый бинарник (самый быстрый)

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

**Время:** ~1 минута  
**Почему работает:** Загружает готовый бинарник из GitHub releases

### Вариант 3: Автоматический скрипт

```bash
cd infra/
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh
```

Скрипт предложит выбрать вариант.

Для быстрой сборки:
```bash
./build-mumble-proxy.sh --quick
```

### Вариант 4: Пропустить mumble-web-proxy

Если не нужен веб-интерфейс Mumble:

```bash
rm ~/.config/containers/systemd/rt-mumble-proxy.container
rm ~/.config/containers/systemd/rt-mumble-web.container
systemctl --user daemon-reload
```

### Вариант 5: Автоматический выбор при установке

```bash
./quadlet/install-quadlet.sh install
```

Скрипт предложит выбрать вариант сборки.

## Проверка сборки

```bash
podman images | grep rt-mumble-web-proxy
```

## Запуск

```bash
systemctl --user start rt-mumble-proxy
```

## Подробная документация

- [MUMBLE-PROXY-BUILD.md](MUMBLE-PROXY-BUILD.md) - детальное описание проблемы и решений
- [QUADLET-README.md](../QUADLET-README.md) - развёртывание через Quadlet
- [TROUBLESHOOTING.md](../quadlet/TROUBLESHOOTING.md) - общее руководство
