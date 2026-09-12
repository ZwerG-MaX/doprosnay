# Быстрый старт с Podman Quadlet

## Установка (автоматическая)

```bash
# Сделайте скрипт исполняемым
chmod +x quadlet/install-quadlet.sh

# Установите Quadlet-конфигурацию
./quadlet/install-quadlet.sh install
```

Скрипт автоматически:
- Проверит наличие Podman 4.0+
- Скопирует Quadlet-файлы в `~/.config/containers/systemd/`
- Скопирует конфигурацию в `~/.config/rt-dopros/`
- Обновит пути в container-файлах
- Соберёт необходимые Docker-образы
- Перезагрузит systemd

## Запуск стека

```bash
# Запустить все сервисы
systemctl --user start rt-dopros.target

# Проверить статус
systemctl --user status rt-dopros.target

# Включить автозапуск при загрузке
systemctl --user enable rt-dopros.target
```

## Проверка работы

```bash
# Список запущенных контейнеров
podman ps

# Логи всех сервисов
journalctl --user -u rt-dopros.target -f

# Логи конкретного сервиса
journalctl --user -u rt-db.service -f
```

## Доступ к сервисам

После запуска сервисы доступны на следующих портах:

| Сервис | URL | Описание |
|--------|-----|----------|
| Пульт | http://localhost:8082 | Веб-интерфейс пульта |
| ONLYOFFICE | http://localhost:8080 | Document Server |
| Nextcloud | http://localhost:8090 | Хранилище документов |
| PostgREST API | http://localhost:3000 | REST API |
| Mumble | localhost:64738 | Голосовой сервер |
| mumble-web | http://localhost:8081 | Веб-клиент Mumble |
| MediaMTX | http://localhost:8888 | Медиа-прокси |
| Traefik Dashboard | http://localhost:8080 | Панель управления |

## Управление

```bash
# Остановить все сервисы
systemctl --user stop rt-dopros.target

# Перезапустить все сервисы
systemctl --user restart rt-dopros.target

# Перезапустить отдельный сервис
systemctl --user restart rt-db

# Посмотреть статус отдельного сервиса
systemctl --user status rt-docs

# Отключить автозапуск
systemctl --user disable rt-dopros.target
```

## Удаление

```bash
# Автоматическое удаление
./quadlet/install-quadlet.sh uninstall

# Или вручную
systemctl --user stop rt-dopros.target
systemctl --user disable rt-dopros.target
rm ~/.config/containers/systemd/rt-*.{network,volume,container,target}
systemctl --user daemon-reload
```

## Отладка

```bash
# Показать статус всех сервисов
./quadlet/install-quadlet.sh status

# Посмотреть логи контейнера
podman logs -f rt-db

# Войти в контейнер
podman exec -it rt-db sh

# Проверить генерацию systemd-юнитов
systemctl --user cat rt-db.service
```

## Решение проблем

### Podman socket не активен

```bash
systemctl --user enable --now podman.socket
```

### Контейнер не запускается

```bash
# Проверить логи
journalctl --user -u rt-db.service -n 50

# Проверить конфигурацию
systemctl --user cat rt-db.service

# Перезапустить systemd
systemctl --user daemon-reload
```

### Образы не собраны

```bash
# Собрать вручную
podman build -t rt-pult:latest -f Dockerfile .
podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/
```

### Ошибка сборки mumble-web-proxy (openssl-sys)

Если при сборке `rt-mumble-web-proxy` возникает ошибка с `openssl-sys`:

**Быстрое решение:** Используйте обновлённый Dockerfile (уже включён):
```bash
podman build -t rt-mumble-web-proxy:latest -f infra/mumble-web-proxy.Dockerfile infra/
```

**Если не помогает:** Пропустите mumble-web-proxy:
```bash
rm ~/.config/containers/systemd/rt-mumble-proxy.container
systemctl --user daemon-reload
```

Подробная документация: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Порты заняты

Измените порты в соответствующих `.container` файлах в `~/.config/containers/systemd/`:

```ini
# Пример: изменить порт пульта с 8082 на 8083
PublishPort=8083:80
```

Затем перезагрузите systemd:

```bash
systemctl --user daemon-reload
systemctl --user restart rt-pult
```

## Дополнительная информация

Полная документация: [QUADLET.md](../QUADLET.md)
