import type { EventItem, EventType } from "../lib/data";
import { Panel } from "./Panel";
import { IcSignal } from "./Icons";

const DOT: Record<EventType, string> = {
  sys: "bg-faint",
  video: "bg-hud shadow-[0_0_6px_rgba(0,176,240,0.7)]",
  audio: "bg-amber shadow-[0_0_6px_rgba(255,138,61,0.7)]",
  doc: "bg-live shadow-[0_0_6px_rgba(49,217,138,0.7)]",
};

const TAG: Record<EventType, string> = {
  sys: "система",
  video: "видео",
  audio: "аудио",
  doc: "документ",
};

export function CollaborationFeed({ events }: { events: EventItem[] }) {
  return (
    <Panel
      title="АКТИВНОСТЬ · СОВМЕСТНАЯ РАБОТА"
      sub="правки, подключения, события сеанса"
      className="h-52 shrink-0 lg:h-auto lg:min-h-[150px] lg:flex-[2]"
      delay={160}
      right={
        <span className="flex items-center gap-1.5 rounded-full border border-line bg-raise px-2 py-0.5 font-mono text-[9.5px] text-dim tabular-nums">
          <IcSignal className="h-3 w-3 text-live" />
          {events.length}
        </span>
      }
    >
      <ul className="flex-1 space-y-[5px] overflow-y-auto px-3.5 py-2.5">
        {events.length === 0 && (
          <li className="font-mono text-[11px] text-faint">ожидание событий…</li>
        )}
        {events.map((e) => (
          <li key={e.id} className="flex items-start gap-2.5 text-[12px] leading-snug">
            <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[e.type]}`} />
            <span className="w-[58px] shrink-0 pt-px font-mono text-[10px] text-faint tabular-nums">
              {e.time}
            </span>
            <span className="min-w-0 flex-1 text-dim">{e.text}</span>
            <span className="hidden shrink-0 rounded-sm border border-line bg-panel2 px-1.5 font-mono text-[8.5px] leading-4 text-faint sm:inline">
              {TAG[e.type]}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
