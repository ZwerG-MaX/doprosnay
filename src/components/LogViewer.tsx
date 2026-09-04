import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  getLogs,
  clearLogs,
  subscribeLogs,
  logsToText,
  type LogLevel,
  type LogEntry,
} from "../lib/logger";
import { IcClose, IcFile, IcTrash, IcSave } from "./Icons";

const LEVEL_STYLE: Record<LogLevel, { dot: string; text: string; label: string }> = {
  debug: { dot: "bg-faint", text: "text-faint", label: "DBG" },
  info: { dot: "bg-hud shadow-[0_0_6px_rgba(0,176,240,0.7)]", text: "text-hud", label: "INF" },
  warn: { dot: "bg-amber shadow-[0_0_6px_rgba(255,138,61,0.7)]", text: "text-amber", label: "WRN" },
  error: { dot: "bg-rec shadow-[0_0_6px_rgba(255,77,94,0.8)]", text: "text-rec", label: "ERR" },
};

type Filter = "all" | LogLevel;

export function LogViewer({ onClose, onToast }: { onClose: () => void; onToast: (s: string) => void }) {
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [, force] = useState(0);

  useEffect(() => subscribeLogs(() => setVersion((v) => v + 1)), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const logs = useMemo(() => getLogs(), [version]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((e: LogEntry) => {
      if (filter !== "all" && e.level !== filter) return false;
      if (!q) return true;
      return `${e.scope} ${e.msg} ${e.detail ?? ""}`.toLowerCase().includes(q);
    });
  }, [logs, filter, search]);

  const counts = useMemo(() => {
    const c: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
    logs.forEach((e) => (c[e.level] += 1));
    return c;
  }, [logs]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(logsToText());
      onToast(`Скопировано ${filtered.length} записей в буфер обмена`);
    } catch {
      onToast("Не удалось получить доступ к буферу обмена");
    }
  };

  const download = () => {
    const blob = new Blob([logsToText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doprosnaya2-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    onToast("Файл логов сформирован");
  };

  const tabBtn = (f: Filter, label: string, count: number | null, activeCls: string) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-mono text-[10px] tracking-wider transition-all active:scale-95 ${
        filter === f ? activeCls : "border-line bg-panel text-dim hover:border-line2 hover:text-fg"
      }`}
    >
      {label}
      {count !== null && <span className="opacity-70 tabular-nums">{count}</span>}
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" onClick={onClose} />
      <div className="rise relative flex max-h-full w-full max-w-[860px] flex-col overflow-hidden rounded-xl border border-line2 bg-panel shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-panel2/70 px-4">
          <IcFile className="h-4.5 w-4.5 text-amber" />
          <h2 className="font-display text-[12px] tracking-[0.18em] text-fg">ЖУРНАЛ ДИАГНОСТИКИ</h2>
          <span className="hidden font-mono text-[9.5px] text-faint sm:block">
            подключения · ONLYOFFICE · события редактора
          </span>
          <button
            onClick={onClose}
            title="Закрыть (ESC)"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-dim transition-all hover:border-rec/60 hover:text-rec active:scale-95"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </header>
        <div className="rt-stripe" />

        {/* панель фильтров */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel2/40 px-4 py-2.5">
          {tabBtn("all", "ВСЕ", logs.length, "border-hud/70 bg-hud/15 text-hud")}
          {tabBtn("info", "ИНФО", counts.info, "border-hud/70 bg-hud/15 text-hud")}
          {tabBtn("warn", "ПРЕДУПР", counts.warn, "border-amber/70 bg-amber/15 text-amber")}
          {tabBtn("error", "ОШИБКИ", counts.error, "border-rec/70 bg-rec/15 text-rec")}
          {tabBtn("debug", "ОТЛАДКА", counts.debug, "border-line2 bg-raise text-dim")}

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="поиск по логам…"
            className="ml-auto h-7 min-w-[140px] flex-1 rounded-md border border-line bg-panel2 px-2.5 font-mono text-[11px] text-fg outline-none transition-all placeholder:text-faint focus:border-hud/60 sm:max-w-[220px]"
          />
        </div>

        {/* список */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0a0f16]/70 px-2 py-2">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <IcFile className="h-8 w-8 text-faint" />
              <p className="font-mono text-[11px] text-faint">записей нет — выполните действие (подключение, проверка)</p>
            </div>
          ) : (
            <ul className="space-y-px">
              {filtered.map((e) => {
                const s = LEVEL_STYLE[e.level];
                return (
                  <li key={e.id} className="group flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-panel2/60">
                    <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                    <span className="w-[86px] shrink-0 pt-px font-mono text-[10px] text-faint tabular-nums">{e.time}</span>
                    <span className={`w-[34px] shrink-0 pt-px font-mono text-[10px] font-semibold ${s.text}`}>{s.label}</span>
                    <span className="w-[86px] shrink-0 truncate pt-px font-mono text-[10px] text-dim">({e.scope})</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] leading-snug text-fg">{e.msg}</div>
                      {e.detail && (
                        <div className="mt-0.5 break-all rounded border border-line/60 bg-panel2/50 px-2 py-1 font-mono text-[10px] leading-relaxed text-dim">
                          {e.detail}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-line bg-panel2/50 px-4 py-3">
          <button
            onClick={() => {
              clearLogs();
              force((x) => x + 1);
              onToast("Журнал диагностики очищен");
            }}
            className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-panel px-3 font-mono text-[10px] tracking-widest text-dim transition-all hover:border-rec/50 hover:text-rec active:scale-95"
          >
            <IcTrash className="h-3.5 w-3.5" />
            ОЧИСТИТЬ
          </button>
          <span className="ml-auto font-mono text-[9.5px] text-faint">
            показано {filtered.length} из {logs.length} · живое обновление
          </span>
          <button
            onClick={download}
            className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-panel px-3 font-mono text-[10px] tracking-widest text-dim transition-all hover:border-hud/50 hover:text-hud active:scale-95"
          >
            <IcSave className="h-3.5 w-3.5" />
            .TXT
          </button>
          <button
            onClick={copy}
            className="rt-grad-bg flex h-9 items-center rounded-md px-4 font-display text-[10.5px] tracking-[0.18em] text-white transition-all hover:brightness-110 active:scale-95"
          >
            КОПИРОВАТЬ
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
