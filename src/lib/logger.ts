export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  scope: string;
  msg: string;
  detail?: string;
}

const LS_KEY = "rt-dopros.logs.v1";
const MAX_KEEP = 400;

let nextId = 1;
let entries: LogEntry[] = load();
const listeners = new Set<() => void>();

function load(): LogEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as LogEntry[];
      if (Array.isArray(arr) && arr.length) {
        nextId = arr.reduce((m, e) => Math.max(m, e.id), 0) + 1;
        return arr;
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_KEEP)));
  } catch {
    /* ignore */
  }
}

function push(level: LogLevel, scope: string, msg: string, detail?: string) {
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const time = `${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}.${String(
    now.getMilliseconds(),
  ).padStart(3, "0")}`;
  entries = [{ id: nextId++, time, level, scope, msg, detail }, ...entries].slice(0, MAX_KEEP);
  persist();
  listeners.forEach((fn) => fn());
}

export const log = {
  debug: (scope: string, msg: string, detail?: string) => push("debug", scope, msg, detail),
  info: (scope: string, msg: string, detail?: string) => push("info", scope, msg, detail),
  warn: (scope: string, msg: string, detail?: string) => push("warn", scope, msg, detail),
  error: (scope: string, msg: string, detail?: string) => push("error", scope, msg, detail),
};

export function getLogs(): LogEntry[] {
  return entries;
}

export function clearLogs() {
  entries = [];
  persist();
  listeners.forEach((fn) => fn());
}

export function subscribeLogs(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Сформировать текст логов для копирования в буфер. */
export function logsToText(): string {
  return entries
    .map((e) => `[${e.time}] [${e.level.toUpperCase().padEnd(5)}] (${e.scope}) ${e.msg}${e.detail ? ` :: ${e.detail}` : ""}`)
    .join("\n");
}
