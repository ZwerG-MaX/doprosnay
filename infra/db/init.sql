-- ═══════════════════════════════════════════════════════════════
--  Пульт наблюдения «Допросная» · СКИТ
--  Схема PostgreSQL + сид-данные. Выполняется автоматически при
--  первом старте контейнера postgres (docker-entrypoint-initdb.d).
-- ═══════════════════════════════════════════════════════════════

-- ── роль для PostgREST (анонимный доступ в демо; в проде — JWT/RLS) ──
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'pult_anon') then
    create role pult_anon nologin;
  end if;
end
$$;

grant usage on schema public to pult_anon;

-- ── пользователи и права ────────────────────────────────────────
create table if not exists users (
  id         text primary key,
  login      text not null unique,
  password   text not null,
  name       text not null,
  title      text not null default 'специалист',
  is_admin   boolean not null default false,
  color      text not null default '#00b0f0',
  muted      boolean not null default false,
  view_rooms text[] not null default '{}',
  edit_rooms text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- миграция для уже созданных томов (логин/пароль)
alter table users add column if not exists login    text;
alter table users add column if not exists password text;
update users set login = lower(id), password = 'skit' where login is null or password is null;
alter table users alter column login    set not null;
alter table users alter column password set not null;
create unique index if not exists users_login_uq on users (login);

-- ── конфигурация серверов (singleton) ───────────────────────────
create table if not exists server_config (
  id          integer primary key default 1 check (id = 1),
  macroscop   jsonb not null,
  mumble      jsonb not null,
  onlyoffice  jsonb not null,
  backend     jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

-- ── шаблоны протоколов (по комнатам) ────────────────────────────
create table if not exists templates (
  room_id    text primary key,
  body       text not null,
  updated_at timestamptz not null default now()
);

-- ── содержимое протоколов (по комнатам) ─────────────────────────
create table if not exists documents (
  room_id    text primary key,
  content    text not null,
  rev        integer not null default 1,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- ── журнал аудита ───────────────────────────────────────────────
create table if not exists audit_log (
  id     bigserial primary key,
  ts     timestamptz not null default now(),
  kind   text not null,           -- sys | video | audio | doc
  body   text not null,
  actor  text
);

grant select, insert, update, delete on users, server_config, templates, documents to pult_anon;
grant select, insert on audit_log to pult_anon;
grant usage on sequence audit_log_id_seq to pult_anon;

-- ── сид: пользователи (8 наблюдателей, u1 — админ) ───────────────
insert into users (id, login, password, name, title, is_admin, color, muted, view_rooms, edit_rooms) values
  ('u1', 'sokolov',   'skit', 'Соколов',         'специалист', true,  '#00b0f0', false, '{r1,r2,r3}', '{r1,r2,r3}'),
  ('u2', 'eremina',   'skit', 'Ерёмина',         'специалист', false, '#f04e9a', false, '{r1,r2,r3}', '{r1,r2}'),
  ('u3', 'volkov',    'skit', 'Волков',          'специалист', false, '#31d98a', false, '{r1,r2}',    '{r1}'),
  ('u4', 'danilova',  'skit', 'Данилова О. В.',  'специалист', false, '#b57bff', false, '{r2}',       '{}'),
  ('u5', 'gushchin',  'skit', 'Гущин П. А.',     'специалист', false, '#ff8a3d', true,  '{r1}',       '{}'),
  ('u6', 'kim',       'skit', 'Ким С. Р.',       'специалист', false, '#ffd83d', false, '{r1,r2}',    '{r1,r2}'),
  ('u7', 'lanskaya',  'skit', 'Ланская Е. А.',   'специалист', false, '#7a9bff', false, '{r1,r2}',    '{}'),
  ('u8', 'kramarenko','skit', 'Крамаренко Д. И.','специалист', false, '#ff6b6b', false, '{r1,r3}',   '{r3}')
on conflict (id) do nothing;

-- ── RPC: проверка логина/пароля (возвращает строку пользователя или пусто) ──
create or replace function public.check_login(p_login text, p_password text)
returns setof public.users
language sql stable security definer
as $$
  select * from public.users
  where login = p_login and password = p_password
  limit 1;
$$;
grant execute on function public.check_login(text, text) to pult_anon;

-- ── сид: конфигурация серверов по умолчанию ─────────────────────
insert into server_config (id, macroscop, mumble, onlyoffice, backend) values (
  1,
  '{"host":"vms-2.rt-cloud.local","port":554,"proto":"rtsp","enabled":true}'::jsonb,
  '{"host":"10.77.2.15","port":64738,"enabled":true,"webUrl":"http://mumble.local"}'::jsonb,
  '{"dsUrl":"https://docs.rt-cloud.local","jwt":"","docUrl":"https://nas-2.rt-cloud.local/docs/protokol-doprosa.docx","enabled":true}'::jsonb,
  '{"enabled":true,"apiUrl":"http://api.local"}'::jsonb
) on conflict (id) do nothing;

-- ── сид: стандартные шаблоны протоколов ─────────────────────────
insert into templates (room_id, body) values
('r1', $tpl$ПРОТОКОЛ ДОПРОСА
Комната: {КОМНАТА} · Дело № {ДЕЛО}
Дата: {ДАТА} · Время начала: {ВРЕМЯ} · Аудиоканал: {КАНАЛ}

── УСТАНОВОЧНАЯ ЧАСТЬ ──
Следователь:
Допрашиваемый:
Защитник:

── ПОКАЗАНИЯ ──
В.:
О.:

── ЗАМЕЧАНИЯ И ХОДАТАЙСТВА ──


Подписи сторон:
Следователь: ______________
Допрашиваемый: ______________
Защитник: ______________$tpl$),

('r2', $tpl$ПРОТОКОЛ СОВМЕСТНОГО НАБЛЮДЕНИЯ
Комната: {КОМНАТА} · Дело № {ДЕЛО}
Дата: {ДАТА} · Смена: {ВРЕМЯ} · Аудиоканал: {КАНАЛ}

── ЗАПИСИ НАБЛЮДАТЕЛЕЙ ──
[Н-1]
[Н-2]
[Н-3]

── ПОВЕДЕНЧЕСКИЕ МАРКЕРЫ ──


── ИТОГИ НАБЛЮДЕНИЯ ──


Старший смены: ______________$tpl$),

('r3', $tpl$ПРОТОКОЛ ОЧНОЙ СТАВКИ
Комната: {КОМНАТА} · Дело № {ДЕЛО}
Дата: {ДАТА} · Время: {ВРЕМЯ} · Аудиоканал: {КАНАЛ}

── УЧАСТНИКИ ──
Лицо 1:
Лицо 2:

── ХОД ОЧНОЙ СТАВКИ ──


── ПОКАЗАНИЯ ──


Подписи сторон:
Следователь: ______________$tpl$)
on conflict (room_id) do nothing;
