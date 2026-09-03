import type { EventItem, EventType } from "../lib/data";
import { Panel } from "./Panel";

const DOT: Record<EventType, string> = {
  sys: "bg-faint",
  video: "bg-hud shadow-[0_0_6px_rgba(69,200,255,0.7)]",
  audio: "bg-amber shadow-[0_0_6px_rgba(255,180,58,0.7)]",
  doc: "bg-live shadow-[0_0_6px_rgba(53,217,127,0.7)]",
};

export function EventLog({ events }: { events: EventItem[] }) {
  return (
    <Panel
      title="ЖУРНАЛ СОБЫТИЙ"
      sub="хронометраж сеанса · автозапись"
      className="h-52 shrink-0 lg:h-auto lg:min-h-[150px] lg:flex-[2]"
      delay={140}
      right={
        <span className="rounded-sm border border-line bg-raise px-2 py-0.5 font-mono text-[10px] text-dim tabular-nums">
          {events.length}
        </span>
      }
    >
      <ul className="flex-1 space-y-[5px] overflow-y-auto px-3.5 py-2.5">
        {events.length === 0 && (
          <li className="font-mono text-[11px] text-faint">инициализация журнала…</li>
        )}
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2.5 text-[12px] leading-snug">
            <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[e.type]}`} />
            <span className="w-[62px] shrink-0 pt-px font-mono text-[10px] text-faint tabular-nums">
              {e.time}
            </span>
            <span className="text-dim">{e.text}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
