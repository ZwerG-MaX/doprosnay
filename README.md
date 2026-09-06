# Допросная №2 — пульт наблюдения (СКИТ)

Web-пульт для комнаты наблюдения при допросной: видеостена **MACROSCOP** (3 камеры на комнату),
аудиоканал **Mumble** с тангентой (PTT), совместный протокол в **ONLYOFFICE Docs**
с шаблонами-`.docx`, ролевая модель (пользователь / администратор), распределение по
комнатам и правам, журнал диагностики.

Стек: React 18 + TypeScript + Vite 6 + Tailwind CSS 4.

---

## Архитектура стека (Traefik + Nextcloud)

```
                 ┌─────────────────────────── Traefik :80 ───────────────────────────┐
 браузер ──►     │  pult.local   →  frontend  (nginx, сборка из Dockerfile)           │
                 │  docs.local   →  docs      (ONLYOFFICE Document Server)            │
                 │  cloud.local  →  cloud     (Nextcloud, SQLite — хранилище)         │
                 │  mumble.local →  mumble-web (HTML5-аудиоклиент) ⇄ mumble-web-proxy │
                 │  api.local    →  api (PostgREST) → db (PostgreSQL 16)              │
                 └────────────────────────────────────────────────────────────────────┘
   Mumble  ──►  mumble  :64738 (tcp/udp)  ·  WebRTC-медиа: udp :64737 (mumble-web-proxy)
   Видео   ──►  vms-demo (демо-VMS, RTSP) ─► media (MediaMTX) ─► браузер
                  :9554-9556 RTSP        :8554 RTSP · :8888 HLS/API · :8889/:8890 WebRTC
```

Сервисы обращаются друг к другу по именам compose-сети: Document Server скачивает
документы из Nextcloud как `http://cloud/...` — без «внешних» адресов.

> **Где MACROSCOP?** Это коммерческая VMS — официального публичного Docker-образа
> нет, её разворачивают на выделенном сервере/регистраторе. В демо-стеке её роль
> играет сервис **`vms-demo`** (ffmpeg-источник, отдаёт тестовые RTSP-таблицы с
> таймкодом). MediaMTX — универсальный мост, поэтому для реального MACROSCOP
> достаточно удалить `vms-demo` и прописать RTSP-адреса камер VMS в
> `infra/mediamtx.yml` (поле `source` у `cam01…cam03`). Остальной стек не меняется.

---

## Быстрый старт

**Локальная разработка:**

```bash
npm install
npm run dev          # http://localhost:5173
```

**Полный стек (Traefik + все серверы + пульт в контейнере):**

1. Пропишите домены (для разработки):
   ```
   # /etc/hosts
   127.0.0.1  pult.local docs.local cloud.local mumble.local api.local
   ```
2. Поднимите стек:
   ```bash
   docker compose up -d --build
   ```
3. Откройте:
   - **http://pult.local** — пульт (или http://localhost)
   - **http://docs.local** — ONLYOFFICE Document Server (`/healthcheck` → `true`)
   - **http://cloud.local** — Nextcloud (админ: `admin` / `rt-cloud-2026`)
   - **http://mumble.local** — аудиоконсоль mumble-web (или кнопка «АУДИОКОНСОЛЬ» в пульте)
   - **http://api.local/users?select=id,name** — PostgreSQL API (PostgREST)
   - **http://localhost:8080** — дашборд Traefik (только dev)

Остановить: `docker compose down` (данные на томах сохраняются).

**Dockerfile** — двухступенчатая сборка: `node:20-alpine` (npm ci + `npm run build`)
→ `nginx:1.27-alpine` (SPA-фолбэк, gzip, кэш ассетов). Пересобрать образ пульта:
`docker compose build frontend`.

---

## Настройка пульта (админ → «СЕРВЕРЫ»)

| Сервер        | Адрес для панели              | Примечание                                                        |
|---------------|-------------------------------|-------------------------------------------------------------------|
| ONLYOFFICE    | `http://docs.local`           | «ПРОВЕРИТЬ ДОСТУП» выполняет реальную загрузку `api.js`            |
| Mumble        | `127.0.0.1` : `64738`         | нативный протокол; браузер подключается через мост (см. ниже)      |
| MACROSCOP     | хост/порт вашего VMS          | RTSP-пути камер — в `infra/mediamtx.yml`                           |

JWT: по умолчанию `JWT_ENABLED=false`. В проде включите JWT в compose и впишите
тот же секрет в поле «JWT-секрет».

---

## Nextcloud как хранилище протоколов

Nextcloud поднят в минимальной конфигурации: встроенная **SQLite**, один админ,
без Redis/cron — достаточно для хранения `.docx`-протоколов.

**Как отдать документ редактору ONLYOFFICE:**

1. Загрузите `.docx` в Nextcloud (веб-интерфейс → «Файлы» или WebDAV:
   `http://cloud.local/remote.php/dav/files/admin/Docs/`).
2. Сформируйте прямой URL — два способа:
   - **Публичная ссылка** (проще): «Поделиться → Создать ссылку», URL документа =
     `http://cloud/index.php/s/<ТОКЕН>/download` (имя `cloud` — из контейнера DS);
   - **WebDAV с авторизацией**: `http://admin:ПАРОЛЬ@cloud/remote.php/dav/files/admin/Docs/протокол.docx`.
3. Вставьте URL в «СЕРВЕРЫ → ONLYOFFICE → URL документа» и «ПРИМЕНИТЬ».

> Автосохранение правок обратно в Nextcloud требует обработчика `callbackUrl`
> (мост DS → WebDAV PUT); при его отсутствии документ работает в режиме чтения/редактирования
> сессии, а итоговый файл выгружается кнопкой «DOCX» в пульте.

Полезно: у Nextcloud есть официальный коннектор ONLYOFFICE — приложение
`onlyoffice` из каталога Nextcloud, если нужен редактор прямо в интерфейсе облака.

---

## Данные · PostgreSQL

Хранилище — **PostgreSQL 16** + **PostgREST** (автогенерируемый REST API):
всего два контейнера, схема и сид-данные — `infra/db/init.sql` (выполняется
автоматически при первом старте тома `db_data`).

| Таблица         | Что хранит                                        |
|-----------------|---------------------------------------------------|
| `users`         | участники, роли, цвета, права (view/edit по комнатам) |
| `server_config` | конфиг MACROSCOP / Mumble / ONLYOFFICE / БД (singleton) |
| `templates`     | шаблоны протоколов по комнатам                    |
| `documents`     | содержимое протоколов + ревизия и автор правки    |
| `audit_log`     | журнал аудита (все события пульта)                |

**Гибридный режим:** при старте пульт обращается к `api.local` (адрес правится
в «Серверы → Данные · PostgreSQL», там же — живая проверка). Если БД доступна —
данные читаются из неё, все изменения (права, конфиг, шаблоны, протоколы, аудит)
пишутся в БД. Если недоступна — пульт прозрачно работает в локальном режиме
(localStorage), пилюля **PG** в шапке показывает статус:
`онлайн + задержка` / `ОШИБКА` / `ЛОКАЛ`.

**Проверка:**
```bash
curl http://api.local/users?select=id,name     # список участников из БД
curl http://api.local/templates?select=room_id # шаблоны
```

**Прод-режим:** сейчас доступ анонимный (роль `pult_anon`, допустимо в закрытой
сети). Для боевой эксплуатации включите JWT в PostgREST (`PGRST_JWT_SECRET`,
`db-anon-role` + `SET ROLE` по токену) либо замените связку на **Supabase**
(тот же PostgreSQL + готовая авторизация и realtime; клиент
`@supabase/supabase-js` уже есть в зависимостях) — слой `src/lib/backend.ts`
изолирует доступ к данным, поэтому замена не затронет интерфейс.

---

## Mumble и MACROSCOP: мосты для браузера

- **Mumble — реальный звук уже работает через аудиоконсоль.** Стек:
  `Murmur (:64738) ⇄ mumble-web-proxy (WebSocket/WebRTC) ⇄ mumble-web (HTML5-клиент)`,
  всё в docker-compose и за Traefik на домене `mumble.local`. В пульте:
  панель «АУДИОКАНАЛ» → кнопка **«АУДИОКОНСОЛЬ»** — открывается реальный клиент
  mumble-web с автоподключением под ником наблюдателя (транслитерируется в ASCII,
  т.к. Murmur не принимает кириллицу по умолчанию) в канал комнаты.
  Адрес клиента редактируется в «Серверы → Mumble → Веб-клиент». Тангенту
  (Push-to-talk) включите внутри mumble-web: Settings → Audio → Push-to-talk,
  либо оставьте Voice activity. UDP `64737` проброшен на хост для WebRTC-медиа;
  если он недоступен, клиент автоматически работает по WebSocket.
  Создать каналы «Допросная №2» и т.п. нужно один раз (любым Mumble-клиентом
  под суперпользователем, пароль `rt-mumble-2026` — в логах Murmur).

  **Полная интеграция (своя тангента управляет реальным звуком).** Если нужно,
  чтобы PTT-кнопка пульта сама открывала/закрывала передачу, вместо эмуляции в
  `src/lib/usePtt.ts` подключается `MumbleConnector` (пакет `mumble-client`).
  Порядок действий:

  1. `npm i mumble-client mumble-connect` и полифилы Node-модулей для Vite:
     `npm i -D vite-plugin-node-polyfills`, затем в `vite.config.js`:
     ```js
     import { nodePolyfills } from "vite-plugin-node-polyfills";
     export default defineConfig({
       plugins: [react(), tailwindcss(), nodePolyfills()],
     });
     ```
  2. Коннектор (новый `src/lib/mumbleClient.ts`):
     ```ts
     import { WebConnector } from "mumble-connect";
     const connector = new WebConnector(); // WebSocket ⇄ mumble-web-proxy
     const client = await connector.connect("wss://mumble.local/proxy", 443, {
       username, password, tokens: [],
     });
     client.on("connect", () => { /* клиент.self — локальный пользователь */ });
     client.self.setSelfMute(true); // старт: микрофон закрыт
     ```
  3. PTT = снятие/установка self-mute (серверного PTT в Mumble нет, это делает клиент):
     ```ts
     const press = () => client.self.setSelfMute(false);  // передача
     const release = () => client.self.setSelfMute(true); // тишина
     ```
  4. В `usePtt.ts` замените эмуляцию (`tx`, таймер, WebAudio-сигнал) на вызовы
     `press/release`, а список участников в `CommPanel` стройте из
     `client.channels` / событий `newUser` / `userDisconnected` вместо
     симуляции.
  5. Прокси для коннектора — тот же `mumble-web-proxy` из compose
     (`wss://mumble.local/proxy`), т.е. отдельный сервер не нужен.

  Пока пакеты `mumble-client` не установлены, сборка не затрагивается: пульт
  использует аудиоконсоль (mumble-web) для реального звука и собственную
  эмуляцию для интерфейса.
- **MACROSCOP.** VMS отдаёт RTSP, браузер его не играет. Связка:
  `VMS (RTSP) → MediaMTX → WebRTC → <video>`. По умолчанию источником служит
  демо-VMS (`vms-demo`, тестовые таблицы с таймкодом); для реального MACROSCOP
  пропишите RTSP-адреса камер в `infra/mediamtx.yml`. Проверка потока:
  `http://localhost:8889/cam01` (или HLS `http://localhost:8888/cam01`).
  Точка замены — `src/components/CameraFeed.tsx` (`<img>` → `<video>` + WHEP
  API MediaMTX: `POST http://localhost:8888/cam01/whep`).

## Совместимость: любая VMS с RTSP

MediaMTX — универсальный медиаброкер, поэтому пульт **не привязан к MACROSCOP**:
подойдёт любая VMS (или даже отдельные IP-камеры), отдающая RTSP. Меняются только
адреса источников в `infra/mediamtx.yml` (`source` у `cam01…camXX`) — WebRTC-мост
и сам пульт остаются без изменений. MediaMTX на входе также принимает RTMP, HLS,
SRT и RTP, а на выход отдаёт WebRTC / HLS / RTSP.

| VMS / источник            | Пример `source` для MediaMTX                              |
|---------------------------|-----------------------------------------------------------|
| MACROSCOP                 | `rtsp://vms:554/macroscop/cam01_main`                     |
| TRASSIR                   | `rtsp://trassir:554/cam01` (Server API → RTSP)            |
| Hikvision iVMS / камера   | `rtsp://user:pass@ip:554/Streaming/Channels/101`          |
| Dahua DSS / камера        | `rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0` |
| Blue Iris                 | `rtsp://bi:8554/cam01`                                    |
| go2rtc (Frigate и др.)    | `rtsp://go2rtc:8554/cam01`                                |
| Shinobi / ZoneMinder      | RTSP-поток инстанса                                       |
| Milestone XProtect        | только через RTSP-шлюз (MIP SDK / XProtect Mobile Server) |

Нюансы:
- если VMS не умеет «отдавать» RTSP наружу, MediaMTX может работать и как
  **RTSP-сервер** — VMS/камера сама публикует поток в `rtsp://media:8554/cam01`
  (`source: publisher`);
- для камер с аутентификацией логин/пароль указываются прямо в URL;
- проверить любой источник до подключения к пульту: `http://localhost:8889/cam01`.

---

## Что сейчас симулируется и где заменять

| Модуль            | Демо-режим                              | Реальный режим                                | Точка замены                        |
|-------------------|------------------------------------------|-----------------------------------------------|--------------------------------------|
| ONLYOFFICE Docs   | встроенный редактор + эмуляция соавторов | **реальный** `DocEditor` (уже работает)       | `src/components/DocumentPanel.tsx`   |
| Видеопотоки       | анимированные кадры + canvas-шум          | WebRTC/HLS из MediaMTX                        | `src/components/CameraFeed.tsx`      |
| Аудио Mumble      | эмуляция PTT, уровней, голосов            | mumble-web + прокси к Murmur                  | `src/lib/usePtt.ts`                  |
| Пользователи/права| localStorage                              | бэкенд с сессиями (Supabase в зависимостях)   | `src/lib/store.tsx`                  |
| Хранилище шаблонов| IndexedDB браузера                        | WebDAV Nextcloud                              | `src/lib/filedb.ts`                  |
| Телеметрия        | генерация значений                        | опрос API (MACROSCOP REST, MediaMTX)          | `src/components/Ticker.tsx`          |

---

## Роли и права

- **Пользователь** — только назначенные комнаты; протокол в режиме чтения,
  если нет права редактирования (в ONLYOFFICE передаётся `mode: "view"`).
- **Администратор** — все комнаты; панели **«СЕРВЕРЫ»** (адреса, порты, JWT,
  вкл/выкл каждого подключения, диагностика), **«ДОСТУП»** (матрица
  «участник × комната»: просмотр / редактирование / админ-права) и
  **«ШАБЛОНЫ»** (загрузка `.docx`-шаблона на комнату, переменные, применение
  к документу).

Настройки, права, шаблоны и сессия сохраняются локально; «Сброс» в панели
серверов возвращает значения по умолчанию. Журнал диагностики — иконка-файл в шапке.
