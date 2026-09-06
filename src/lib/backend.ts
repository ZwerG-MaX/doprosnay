/* Слой данных: PostgreSQL через PostgREST.
 *
 * Архитектура гибридная: если БД настроена и доступна — данные (пользователи,
 * права, конфиг, шаблоны, протоколы, аудит) читаются и пишутся в БД;
 * при недоступности пульт прозрачно работает в локальном режиме (localStorage).
 *
 * Endpoints PostgREST (схема public):
 *   GET/POST  /users           — участники и права
 *   GET/POST  /server_config   — конфиг серверов (singleton id=1)
 *   GET/POST  /templates       — шаблоны протоколов по комнатам
 *   GET/POST  /documents       — содержимое протоколов
 *   POST      /audit_log       — журнал аудита
 */

import { log } from "./logger";
import type { ServerConfig, UserRec } from "./data";

export type DbState = "off" | "connecting" | "online" | "error";

export interface DbStatus {
  state: DbState;
  latencyMs: number | null;
  error: string | null;
  userCount: number | null;
}

/* ── строки БД ↔ типы фронтенда ── */
interface UserRow {
  id: string;
  login: string;
  password: string;
  name: string;
  title: string;
  is_admin: boolean;
  color: string;
  muted: boolean;
  view_rooms: string[];
  edit_rooms: string[];
}

interface ConfigRow {
  id: number;
  macroscop: ServerConfig["macroscop"];
  mumble: ServerConfig["mumble"];
  onlyoffice: ServerConfig["onlyoffice"];
  backend: ServerConfig["backend"];
}

export interface DocRow {
  room_id: string;
  content: string;
  rev: number;
  updated_by: string | null;
  updated_at: string;
}

const rowToUser = (r: UserRow): UserRec => ({
  id: r.id,
  login: r.login,
  password: r.password,
  name: r.name,
  title: r.title,
  isAdmin: r.is_admin,
  color: r.color,
  muted: r.muted,
  view: r.view_rooms ?? [],
  edit: r.edit_rooms ?? [],
});

const userToRow = (u: UserRec): UserRow => ({
  id: u.id,
  login: u.login,
  password: u.password,
  name: u.name,
  title: u.title,
  is_admin: u.isAdmin,
  color: u.color,
  muted: !!u.muted,
  view_rooms: u.view,
  edit_rooms: u.edit,
});

/* ── состояние и подписка (для пилюли статуса в шапке) ── */
let state: DbStatus = { state: "off", latencyMs: null, error: null, userCount: null };
let baseUrl = "";
let listeners: Array<(s: DbStatus) => void> = [];

const emit = () => listeners.forEach((l) => l({ ...state }));

export function onDbStatus(l: (s: DbStatus) => void): () => void {
  listeners.push(l);
  l({ ...state });
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

export const getDbStatus = (): DbStatus => ({ ...state });

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(baseUrl + path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const UPSERT = { "Prefer": "resolution=merge-duplicates" };

export const backend = {
  get online(): boolean {
    return state.state === "online";
  },

  /** Проверяет доступность PostgREST и запоминает адрес. */
  async init(url: string, enabled: boolean): Promise<boolean> {
    if (!enabled || !url.trim()) {
      state = { state: "off", latencyMs: null, error: null, userCount: null };
      emit();
      return false;
    }
    baseUrl = url.trim().replace(/\/+$/, "");
    state = { ...state, state: "connecting", error: null };
    emit();
    const t0 = performance.now();
    try {
      const rows = await req<Array<{ id: string }>>("/users?select=id");
      state = {
        state: "online",
        latencyMs: Math.round(performance.now() - t0),
        error: null,
        userCount: rows.length,
      };
      log.info(
        "DB",
        "PostgreSQL (PostgREST) подключена",
        `${baseUrl} · ${state.latencyMs} мс · пользователей: ${rows.length}`,
      );
      emit();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      state = { state: "error", latencyMs: null, error: msg, userCount: null };
      log.error("DB", "PostgreSQL недоступна — работаем в локальном режиме", `${baseUrl}: ${msg}`);
      emit();
      return false;
    }
  },

  /* ── пользователи ── */
  fetchUsers: (): Promise<UserRec[]> =>
    req<UserRow[]>("/users?select=*&order=id").then((rows) => rows.map(rowToUser)),

  upsertUser: (u: UserRec): Promise<void> =>
    req("/users", {
      method: "POST",
      headers: UPSERT,
      body: JSON.stringify({ ...userToRow(u), updated_at: new Date().toISOString() }),
    }).then(() => undefined),

  deleteUser: (id: string): Promise<void> =>
    req(`/users?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }).then(() => undefined),

  /** Проверка логина/пароля через RPC PostgREST (пароль не уходит в клиентский список). */
  checkLogin: (login: string, password: string): Promise<UserRec | null> =>
    req<UserRow[]>("/rpc/check_login", {
      method: "POST",
      body: JSON.stringify({ p_login: login, p_password: password }),
    }).then((rows) => (rows && rows.length ? rowToUser(rows[0]) : null)),

  /* ── конфигурация серверов ── */
  fetchConfig: (): Promise<ServerConfig | null> =>
    req<ConfigRow[]>("/server_config?id=eq.1").then((rows) => {
      const r = rows[0];
      if (!r) return null;
      return { macroscop: r.macroscop, mumble: r.mumble, onlyoffice: r.onlyoffice, backend: r.backend };
    }),

  saveConfig: (c: ServerConfig): Promise<void> =>
    req("/server_config", {
      method: "POST",
      headers: UPSERT,
      body: JSON.stringify({ id: 1, ...c, updated_at: new Date().toISOString() }),
    }).then(() => undefined),

  /* ── шаблоны ── */
  fetchTemplates: (): Promise<Record<string, string>> =>
    req<Array<{ room_id: string; body: string }>>("/templates?select=room_id,body").then((rows) => {
      const out: Record<string, string> = {};
      rows.forEach((r) => (out[r.room_id] = r.body));
      return out;
    }),

  saveTemplate: (roomId: string, body: string): Promise<void> =>
    req("/templates", {
      method: "POST",
      headers: UPSERT,
      body: JSON.stringify({ room_id: roomId, body, updated_at: new Date().toISOString() }),
    }).then(() => undefined),

  /* ── протоколы ── */
  fetchDocument: (roomId: string): Promise<DocRow | null> =>
    req<DocRow[]>(`/documents?room_id=eq.${encodeURIComponent(roomId)}`).then((r) => r[0] ?? null),

  saveDocument: (roomId: string, content: string, actor: string | null, rev: number): Promise<void> =>
    req("/documents", {
      method: "POST",
      headers: UPSERT,
      body: JSON.stringify({
        room_id: roomId,
        content,
        rev,
        updated_by: actor,
        updated_at: new Date().toISOString(),
      }),
    }).then(() => undefined),

  /* ── аудит ── */
  audit: (kind: string, body: string, actor?: string | null): void => {
    if (!backend.online) return;
    req("/audit_log", {
      method: "POST",
      body: JSON.stringify({ kind, body, actor: actor ?? null }),
    }).catch(() => undefined);
  },
};
