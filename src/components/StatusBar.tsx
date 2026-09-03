import { useState } from "react";
import { useNow, useInterval, fmtClock, fmtDate, fmtDur, randInt } from "../lib/hooks";
import { IcRt } from "./Icons";

const chip =
  "flex items-center gap-1.5 rounded-full border border-line bg-panel2/80 px-3 py-1 font-mono text-[10px] tracking-wider text-dim";

export function StatusBar({ sessionStart }: { sessionStart: number }) {
  const now = useNow(1000);
  const [latency, setLatency] = useState(24);
  useInterval(() => setLatency(randInt(17, 44)), 2600);

  return (
    <header className="rise relative flex h-16 shrink-0 items-center gap-3 border-b border-line bg-panel/95 px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <IcRt className="h-9 w-9 shrink-0" />
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-2.5">
            <span className="rt-grad-text font-display text-[15px] font-bold tracking-wide">
              РОСТЕЛЕКОМ
            </span>
            <span className="hidden h-4 w-px shrink-0 bg-line2 sm:block" />
            <span className="hidden shrink-0 font-display text-[10.5px] tracking-[0.22em] text-fg sm:block">
              ВИДЕОНАБЛЮДЕНИЕ
            </span>
          </div>
          <div className="mt-0.5 truncate font-mono text-[9px] tracking-wider text-faint">
            Допросная №2 · пульт наблюдения · СИЗО-1 · пост 7
          </div>
        </div>
      </div>

      <div className="mx-auto hidden flex-col items-center leading-none lg:flex">
        <span className="font-mono text-[22px] font-semibold tracking-widest text-fg tabular-nums">
          {fmtClock(now)}
        </span>
        <span className="mt-1 font-mono text-[9.5px] tracking-[0.22em] text-faint">
          {fmtDate(now)} · СМЕНА Б · ДЕЖ. ОФИЦЕР
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5 md:gap-2 lg:ml-0">
        <span className={`${chip} hidden sm:flex`}>
          <span className="led bg-live shadow-[0_0_7px_rgba(49,217,138,0.9)]" />
          MACROSCOP·VMS2
        </span>
        <span className={chip}>
          <span className="led bg-hud shadow-[0_0_7px_rgba(0,176,240,0.9)]" />
          MUMBLE·{latency}мс
        </span>
        <span className="flex items-center gap-2 rounded-full border border-rec/40 bg-rec/10 px-3 py-1">
          <span className="led blink-rec bg-rec shadow-[0_0_8px_rgba(255,77,94,0.9)]" />
          <span className="font-mono text-[10px] font-semibold tracking-widest text-rec">
            REC {fmtDur(now.getTime() - sessionStart)}
          </span>
        </span>
      </div>

      {/* фирменная градиентная полоса РТ */}
      <div className="rt-stripe absolute inset-x-0 bottom-0" />
    </header>
  );
}
