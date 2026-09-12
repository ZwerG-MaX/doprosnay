# Production-конфигурация для Quadlet

Этот документ описывает настройку Quadlet для production-окружения с HTTPS и реальными доменами.

## Предварительные требования

1. Зарегистрированные домены:
   - `pult.example.com` — пульт
   - `docs.example.com` — ONLYOFFICE
   - `cloud.example.com` — Nextcloud
   - `mumble.example.com` — mumble-web

2. SSL-сертификаты (Let's Encrypt или самоподписанные)

3. Настроенный firewall (открыты порты 80, 443, 64738)

## Настройка Traefik с HTTPS

### 1. Создайте директорию для сертификатов

```bash
mkdir -p ~/.config/rt-dopros/certs
```

### 2. Получите сертификаты Let's Encrypt

```bash
# Установите certbot
sudo apt install certbot

# Получите сертификаты
sudo certbot certonly --standalone -d pult.example.com
sudo certbot certonly --standalone -d docs.example.com
sudo certbot certonly --standalone -d cloud.example.com
sudo certbot certonly --standalone -d mumble.example.com

# Скопируйте сертификаты
sudo cp -r /etc/letsencrypt/live/* ~/.config/rt-dopros/certs/
sudo chown -R $USER:$USER ~/.config/rt-dopros/certs
```

### 3. Создайте production Traefik container

Создайте файл `~/.config/containers/systemd/rt-traefik-prod.container`:

```ini
[Unit]
Description=Traefik — reverse proxy (production with HTTPS)
After=rt-dopros-net.network
Requires=rt-dopros-net.network

[Container]
Image=docker.io/library/traefik:v3.1
ContainerName=rt-traefik-prod
Volume=/run/user/1000/podman/podman.sock:/var/run/docker.sock:ro
Volume=/home/YOUR_USER/.config/rt-dopros/certs:/certs:ro,Z
Network=rt-dopros-net.network
PublishPort=80:80
PublishPort=443:443
Arg=--providers.docker=true
Arg=--providers.docker.exposedbydefault=false
Arg=--entrypoints.web.address=:80
Arg=--entrypoints.websecure.address=:443
Arg=--entrypoints.web.http.redirections.entryPoint.to=websecure
Arg=--entrypoints.web.http.redirections.entryPoint.scheme=https
Arg=--certificatesresolvers.le.acme.email=admin@example.com
Arg=--certificatesresolvers.le.acme.storage=/certs/acme.json
Arg=--certificatesresolvers.le.acme.tlschallenge=true
Arg=--api.dashboard=true
Arg=--api.insecure=false
Arg=--log.level=INFO

[Install]
WantedBy=default.target
```

### 4. Добавьте labels для маршрутизации

Quadlet не поддерживает labels напрямую, поэтому создайте отдельные network aliases.

Создайте файл `~/.config/containers/systemd/rt-pult-prod.container`:

```ini
[Unit]
Description=Пульт наблюдения — frontend (production)
After=rt-traefik-prod.service rt-dopros-net.network
Requires=rt-traefik-prod.service rt-dopros-net.network

[Container]
Image=rt-pult:latest
ContainerName=rt-pult-prod
Network=rt-dopros-net.network
NetworkAlias=pult.example.com
PublishPort=8082:80

[Install]
WantedBy=default.target
```

Повторите для других сервисов с соответствующими доменами.

### 5. Включите JWT для ONLYOFFICE

Отредактируйте `~/.config/containers/systemd/rt-docs.container`:

```ini
[Container]
Image=docker.io/onlyoffice/documentserver:latest
ContainerName=rt-docs
Environment=JWT_ENABLED=true
Environment=JWT_SECRET=your-secret-key-change-this-in-production
Environment=JWT_HEADER=Authorization
Environment=JWT_IN_BODY=true
# ... остальные настройки
```

### 6. Настройте firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 64738/tcp
sudo ufw allow 64738/udp

# firewalld (Fedora/RHEL)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=64738/tcp
sudo firewall-cmd --permanent --add-port=64738/udp
sudo firewall-cmd --reload
```

### 7. Настройте автоматическое обновление сертификатов

Создайте cron-задачу:

```bash
crontab -e
```

Добавьте:

```cron
0 3 * * * certbot renew --quiet && cp -r /etc/letsencrypt/live/* ~/.config/rt-dopros/certs/ && systemctl --user restart rt-traefik-prod
```

## Мониторинг и логирование

### 1. Настройте log rotation

Создайте файл `/etc/systemd/journald.conf.d/rt-dopros.conf`:

```ini
[Journal]
SystemMaxUse=1G
SystemMaxFileSize=100M
MaxRetentionSec=30day
```

Перезагрузите journald:

```bash
sudo systemctl restart systemd-journald
```

### 2. Настройте мониторинг

Создайте systemd service для мониторинга:

```bash
mkdir -p ~/.config/systemd/user
```

Создайте файл `~/.config/systemd/user/rt-dopros-monitor.service`:

```ini
[Unit]
Description=Пульт наблюдения — мониторинг
After=rt-dopros.target
Wants=rt-dopros.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'systemctl --user is-active rt-dopros.target || systemctl --user start rt-dopros.target'

[Install]
WantedBy=default.target
```

Создайте timer для периодической проверки:

```bash
~/.config/systemd/user/rt-dopros-monitor.timer
```

```ini
[Unit]
Description=Пульт наблюдения — периодическая проверка

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

Активируйте:

```bash
systemctl --user enable --now rt-dopros-monitor.timer
```

## Резервное копирование

### 1. Создайте скрипт бэкапа

Создайте файл `~/.config/rt-dopros/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="$HOME/backups/rt-dopros"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Бэкап PostgreSQL
podman exec rt-db pg_dump -U pult pult | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Бэкап Nextcloud
podman exec rt-cloud tar czf - /var/www/html/data | gzip > "$BACKUP_DIR/cloud_$DATE.tar.gz"

# Бэкап конфигурации
tar czf "$BACKUP_DIR/config_$DATE.tar.gz" -C "$HOME/.config/rt-dopros" .

# Удаление старых бэкапов (оставить последние 7)
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Сделайте исполняемым:

```bash
chmod +x ~/.config/rt-dopros/backup.sh
```

### 2. Настройте автоматический бэкап

```bash
crontab -e
```

Добавьте:

```cron
0 2 * * * $HOME/.config/rt-dopros/backup.sh >> $HOME/backups/rt-dopros/backup.log 2>&1
```

## Восстановление из бэкапа

```bash
# Восстановление PostgreSQL
gunzip -c db_20240101_120000.sql.gz | podman exec -i rt-db psql -U pult pult

# Восстановление Nextcloud
gunzip -c cloud_20240101_120000.tar.gz | podman exec -i rt-cloud tar xzf - -C /

# Восстановление конфигурации
tar xzf config_20240101_120000.tar.gz -C ~/.config/rt-dopros/
```

## Безопасность

### 1. Измените пароли по умолчанию

Отредактируйте соответствующие `.container` файлы:

- `rt-db.container`: `POSTGRES_PASSWORD`
- `rt-docs.container`: `JWT_SECRET`
- `rt-cloud.container`: `NEXTCLOUD_ADMIN_PASSWORD`
- `rt-mumble.container`: `MUMBLE_SUPERUSER_PASSWORD`

### 2. Ограничьте доступ к API

Добавьте в `rt-api.container`:

```ini
[Container]
# ... остальные настройки
Environment=PGRST_DB_ANON_ROLE=pult_anon
Environment=PGRST_JWT_SECRET=your-jwt-secret
```

### 3. Включите fail2ban для Mumble

```bash
sudo apt install fail2ban

# Создайте конфигурацию
sudo tee /etc/fail2ban/jail.d/mumble.conf <<EOF
[mumble]
enabled = true
port = 64738
filter = mumble
logpath = /var/log/syslog
maxretry = 5
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

## Производительность

### 1. Настройте ресурсы для контейнеров

Добавьте в `.container` файлы:

```ini
[Container]
Memory=2g
CPUs=2
```

### 2. Оптимизируйте PostgreSQL

Создайте файл `~/.config/rt-dopros/postgresql.conf`:

```ini
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 4MB
maintenance_work_mem = 64MB
```

Добавьте volume в `rt-db.container`:

```ini
Volume=/home/YOUR_USER/.config/rt-dopros/postgresql.conf:/etc/postgresql/postgresql.conf:ro,Z
```

## Дополнительная информация

- [Quadlet документация](https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html)
- [Traefik документация](https://doc.traefik.io/traefik/)
- [Podman security](https://docs.podman.io/en/latest/markdown/podman-run.1.html#security)
