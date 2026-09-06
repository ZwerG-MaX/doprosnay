import { useState } from "react";
import { useNow, useInterval, fmtClock, fmtDate, fmtDur, randInt } from "../lib/hooks";
import { useStore, mumbleUrlOf } from "../lib/store";
import { RtMark, IcGear, IcUsers, IcLogout, IcShield, IcFile, IcTemplate } from "./Icons";

interface Props {
  sessionStart: number;
  onOpenServers: () => void;
  onOpenAccess: () => void;
  onOpenTemplates: () => void;
  onOpenLogs: () => void;
  onLogout: () => void;
}

export function StatusBar({ sessionStart, onOpenServers, onOpenAccess, onOpenTemplates, onOpenLogs, onLogout }: Props) {
  const now = useNow(1000);
  const { config, me, room } = useStore();
  const [latency, setLatency] = useState(24);
  useInterval(() => setLatency(randInt(17, 44)), 2600);

  return (
    <header className="rise flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel/95 px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <RtMark className="h-7 w-7 shrink-0" />
        <div className="min-w-0 leading-tight">
          <div className="font-display text-[12px] uppercase tracking-[0.14em] text-fg">
            <span className="rt-grad-text">СКИТ</span>{" "}
            <span className="hidden text-dim sm:inline">· Допросная</span>
          </div>
          <div className="truncate font-mono text-[9px] tracking-wider text-faint">
            {room.code} · {room.name.toUpperCase()} · СИЗО-1
          </div>
        </div>
      </div>

      <div className="mx-auto hidden flex-col items-center leading-none lg:flex">
        <span className="font-mono text-[22px] font-semibold tracking-widest text-fg tabular-nums">
          {fmtClock(now)}
        </span>
        <span className="mt-1 font-mono text-[9.5px] tracking-[0.22em] text-faint">
          {fmtDate(now)} · СМЕНА Б · ПОСТ 7
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2 lg:ml-0">
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider xl:flex ${
            config.macroscop.enabled
              ? "border-line bg-panel2 text-dim"
              : "border-line/60 bg-panel text-faint line-through decoration-faint/60"
          }`}
          title={`${config.macroscop.host}:${config.macroscop.port}${config.macroscop.enabled ? "" : " · отключён администратором"}`}
        >
          <span
            className={`led ${
              config.macroscop.enabled ? "bg-live shadow-[0_0_7px_rgba(49,217,138,0.9)]" : "bg-faint"
            }`}
          />
          MACROSCOP{config.macroscop.enabled ? "" : "·ОТКЛ"}
        </span>
        <span
          className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wider xl:flex ${
            config.mumble.enabled
              ? "border-line bg-panel2 text-dim"
              : "border-line/60 bg-panel text-faint line-through decoration-faint/60"
          }`}
          title={`${mumbleUrlOf(config)}${config.mumble.enabled ? "" : " · отключён администратором"}`}
        >
          <span className={`led ${config.mumble.enabled ? "bg-hud shadow-[0_0_7px_rgba(0,176,240,0.9)]" : "bg-faint"}`} />
          MUMBLE{config.mumble.enabled ? `·${latency}мс` : "·ОТКЛ"}
        </span>
        <span className="flex items-center gap-2 rounded-full border border-rec/40 bg-rec/10 px-2.5 py-1">
          <span className="led blink-rec bg-rec shadow-[0_0_8px_rgba(255,77,94,0.9)]" />
          <span className="font-mono text-[10px] font-semibold tracking-widest text-rec tabular-nums">
            REC {fmtDur(now.getTime() - sessionStart)}
          </span>
        </span>

        {/* пользователь */}
        <span className="flex items-center gap-2 rounded-full border border-line bg-panel2 py-1 pl-1 pr-2.5">
          <span
            className="grid h-6 w-6 place-items-center rounded-full font-display text-[9px] font-bold text-ink"
            style={{ background: me?.color }}
          >
            {me?.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="hidden flex-col leading-none md:flex">
            <span className="max-w-[120px] truncate text-[11px] font-semibold text-fg">{me?.name}</span>
            <span className={`mt-0.5 flex items-center gap-1 font-mono text-[8.5px] tracking-wider ${me?.isAdmin ? "text-violet" : "text-faint"}`}>
              {me?.isAdmin && <IcShield className="h-2.5 w-2.5" />}
              {me?.isAdmin ? "АДМИНИСТРАТОР" : "ОПЕРАТОР"}
            </span>
          </span>
        </span>

        {/* админ-инструменты */}
        {me?.isAdmin && (
          <>
            <button
              onClick={onOpenServers}
              title="Редактировать подключения к серверам (MACROSCOP · Mumble · ONLYOFFICE)"
              className="flex h-8 items-center gap-1.5 rounded-full border border-violet/50 bg-violet/10 px-2.5 text-violet transition-all hover:border-violet hover:bg-violet/20 hover:shadow-[0_0_14px_rgba(122,92,245,0.3)] active:scale-95"
            >
              <IcGear className="h-4 w-4" />
              <span className="hidden font-mono text-[10px] tracking-widest sm:inline">СЕРВЕРЫ</span>
            </button>
            <button
              onClick={onOpenAccess}
              title="Управление доступом: комнаты и права"
              className="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel2 text-dim transition-all hover:border-hud/60 hover:text-hud hover:shadow-[0_0_12px_rgba(0,176,240,0.25)] active:scale-90"
            >
              <IcUsers className="h-4 w-4" />
            </button>
            <button
              onClick={onOpenTemplates}
              title="Шаблоны протоколов по комнатам"
              className="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel2 text-dim transition-all hover:border-live/60 hover:text-live hover:shadow-[0_0_12px_rgba(49,217,138,0.25)] active:scale-90"
            >
              <IcTemplate className="h-4 w-4" />
            </button>
          </>
        )}

        <button
          onClick={onOpenLogs}
          title="Журнал диагностики (логи подключений)"
          className="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel2 text-dim transition-all hover:border-amber/60 hover:text-amber hover:shadow-[0_0_12px_rgba(255,138,61,0.25)] active:scale-90"
        >
          <IcFile className="h-4 w-4" />
        </button>

        <button
          onClick={onLogout}
          title="Выйти из системы"
          className="grid h-8 w-8 place-items-center rounded-full border border-line bg-panel2 text-dim transition-all hover:border-rec/60 hover:text-rec hover:shadow-[0_0_12px_rgba(255,77,94,0.25)] active:scale-90"
        >
          <IcLogout className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
