import { useState } from "react";
import { useNow, useInterval, fmtClock, fmtDate, fmtDur, randInt } from "../lib/hooks";
import { IcLogo } from "./Icons";

export function StatusBar({ sessionStart }: { sessionStart: number }) {
  const now = useNow(1000);
  const [latency, setLatency] = useState(24);
  useInterval(() => setLatency(randInt(17, 44)), 2600);

  return (
    <header className="rise flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel/95 px-3 md:px-4">
      <div className="flex items-center gap-2.5">
        <IcLogo className="h-7 w-7 text-amber" />
        <div className="leading-tight">
          <div className="font-display text-[13px] tracking-[0.2em] text-fg">
            ДОПРОСНАЯ <span className="text-amber">№2</span>
          </div>
          <div className="font-mono text-[9.5px] tracking-wider text-faint">
            ПУЛЬТ НАБЛЮДЕНИЯ · СИЗО-1 · ПОСТ 7
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
        <span className="hidden items-center gap-1.5 rounded-sm border border-line bg-panel2 px-2.5 py-1 font-mono text-[10px] tracking-wider text-dim sm:flex">
          <span className="led bg-live shadow-[0_0_7px_rgba(53,217,127,0.9)]" />
          MACROSCOP·VMS2
        </span>
        <span className="flex items-center gap-1.5 rounded-sm border border-line bg-panel2 px-2.5 py-1 font-mono text-[10px] tracking-wider text-dim">
          <span className="led bg-hud shadow-[0_0_7px_rgba(69,200,255,0.9)]" />
          MUMBLE·{latency}мс
        </span>
        <span className="flex items-center gap-2 rounded-sm border border-rec/40 bg-rec/10 px-2.5 py-1">
          <span className="led blink-rec bg-rec shadow-[0_0_8px_rgba(255,59,78,0.9)]" />
          <span className="font-mono text-[10px] font-semibold tracking-widest text-rec">
            REC {fmtDur(now.getTime() - sessionStart)}
          </span>
        </span>
      </div>
    </header>
  );
}
