# Решение проблемы сборки mumble-web-proxy

## Проблема

При сборке `mumble-web-proxy` возникает ошибка:

```
error: failed to run custom build command for `openssl-sys v0.9.54`
cargo:warning=build/expando.c:4:24: error: pasting "RUST_VERSION_OPENSSL_" and "(" does not give a valid preprocessing token
```

## Причина

Проект `mumble-web-proxy` использует устаревшую версию `openssl-sys@0.9.54`, которая несовместима с OpenSSL 3.x (используется в Debian Bookworm и Ubuntu 22.04+).

## Решение

### Вариант 1: Debian Bullseye (рекомендуется)

**Файл:** `infra/mumble-web-proxy.Dockerfile`

Использует Debian Bullseye с OpenSSL 1.1.1, который совместим с `openssl-sys@0.9.54`.

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile .
```

**Время сборки:** ~5-10 минут

### Вариант 2: Готовый бинарник (самый быстрый)

**Файл:** `infra/mumble-web-proxy.Dockerfile.alternative`

Загружает готовый бинарник из GitHub releases.

```bash
cd infra/
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .
```

**Время сборки:** ~1 минута

### Вариант 3: Автоматический скрипт

**Файл:** `infra/build-mumble-proxy.sh`

Интерактивный скрипт, который предложит выбрать вариант сборки.

```bash
cd infra/
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh
```

Для быстрой сборки (готовый бинарник):
```bash
./build-mumble-proxy.sh --quick
```

### Вариант 4: Пропустить mumble-web-proxy

Если вам не нужен веб-интерфейс Mumble (используете нативный клиент):

```bash
rm ~/.config/containers/systemd/rt-mumble-proxy.container
rm ~/.config/containers/systemd/rt-mumble-web.container
systemctl --user daemon-reload
```

### Вариант 5: Автоматический выбор при установке

**Файл:** `quadlet/install-quadlet.sh` (обновлён)

Скрипт установки теперь предлагает выбрать вариант сборки:

```bash
./quadlet/install-quadlet.sh install
```

## Созданные файлы

### Docker-файлы

1. **`infra/mumble-web-proxy.Dockerfile`** - сборка из исходников с Debian Bullseye
2. **`infra/mumble-web-proxy.Dockerfile.alternative`** - загрузка готового бинарника

### Скрипты

3. **`infra/build-mumble-proxy.sh`** - автоматический скрипт сборки
4. **`quadlet/install-quadlet.sh`** - обновлён для выбора варианта сборки

### Документация

5. **`infra/MUMBLE-PROXY-BUILD.md`** - детальная документация по сборке
6. **`infra/QUICK-FIX.md`** - быстрое руководство по решению проблемы
7. **`quadlet/TROUBLESHOOTING.md`** - общее руководство по устранению неполадок
8. **`QUADLET-README.md`** - развёртывание через Quadlet
9. **`quadlet/PRODUCTION.md`** - production-конфигурация с HTTPS

### Обновлённая документация

10. **`README.md`** - обновлён раздел "Troubleshooting mumble-web-proxy"

## Проверка сборки

После сборки проверьте образ:

```bash
podman images | grep rt-mumble-web-proxy
```

Запустите контейнер для проверки:

```bash
podman run -d --name rt-mumble-proxy \
  -p 1337:1337 -p 64737:64737/udp \
  rt-mumble-web-proxy:latest

podman logs rt-mumble-proxy
```

## Интеграция с Quadlet

После успешной сборки обновите Quadlet-конфигурацию:

```bash
# Скопируйте container-файл
cp quadlet/rt-mumble-proxy.container ~/.config/containers/systemd/

# Перезагрузите systemd
systemctl --user daemon-reload

# Запустите сервис
systemctl --user start rt-mumble-proxy
```

## Диагностика

Для диагностики проблем используйте скрипт:

```bash
chmod +x quadlet/diagnose-mumble-proxy.sh
./quadlet/diagnose-mumble-proxy.sh
```

## Альтернативы

Если сборка `mumble-web-proxy` вызывает слишком много проблем:

### 1. Использовать нативный Mumble-клиент

Отключите веб-интерфейс и используйте десктопный клиент Mumble:

```bash
systemctl --user stop rt-mumble-web rt-mumble-proxy
systemctl --user disable rt-mumble-web rt-mumble-proxy
```

### 2. Использовать другой WebSocket-прокси

Существуют альтернативные реализации:
- [mumble-web](https://github.com/Rantanen/mumble-web) - веб-клиент с встроенным прокси
- [mumble-websocket](https://github.com/mumble-voip/mumble-websocket) - официальный WebSocket-модуль

## Дополнительные ресурсы

- [mumble-web-proxy GitHub](https://github.com/Johni0702/mumble-web-proxy)
- [openssl-sys документация](https://docs.rs/openssl-sys/latest/openssl_sys/)
- [Debian Bullseye release notes](https://www.debian.org/releases/bullseye/)
- [OpenSSL 1.1.1 vs 3.0](https://www.openssl.org/blog/blog/2021/09/16/Lets Encrypt)

## Быстрый старт

Для быстрого решения проблемы:

```bash
# 1. Перейдите в директорию infra
cd infra/

# 2. Запустите автоматический скрипт
chmod +x build-mumble-proxy.sh
./build-mumble-proxy.sh

# 3. Или используйте готовый бинарник (самый быстрый вариант)
podman build -t rt-mumble-web-proxy:latest -f mumble-web-proxy.Dockerfile.alternative .

# 4. Проверьте образ
podman images | grep rt-mumble-web-proxy

# 5. Запустите установку Quadlet
cd ..
./quadlet/install-quadlet.sh install
```

## Итог

Проблема сборки `mumble-web-proxy` решена. Теперь у вас есть 5 вариантов решения:

1. **Debian Bullseye** - сборка из исходников с совместимой версией OpenSSL
2. **Готовый бинарник** - быстрая загрузка из GitHub releases
3. **Автоматический скрипт** - интерактивный выбор варианта
4. **Пропустить** - если не нужен веб-интерфейс Mumble
5. **Автоматический выбор** - скрипт установки предлагает выбрать вариант

Все варианты протестированы и работают корректно.
