import { useState } from "react";
import { useInterval, randInt } from "../lib/hooks";
import { CAMERAS, MUMBLE_URL, VMS_HOST } from "../lib/data";

function genStats(): string[] {
  return [
    ...CAMERAS.map((c) => `${c.num} ${(randInt(3600, 4800) / 1000).toFixed(2)} Мбит/с`),
    `потери пакетов ${(Math.random() * 0.6).toFixed(2)}%`,
    `Mumble ${randInt(17, 42)} мс`,
    `CPU ${randInt(21, 46)}%`,
    `архив: запись ${randInt(9, 16)} МБ/с`,
    `хранилище 214,6 ГБ из 4 ТБ`,
    VMS_HOST,
    MUMBLE_URL,
  ];
}

export function Ticker() {
  const [stats, setStats] = useState<string[]>(() => genStats());
  useInterval(() => setStats(genStats()), 2400);
  const line = stats.join("   ··   ");

  return (
    <footer className="flex h-8 shrink-0 items-stretch overflow-hidden border-t border-line bg-panel/95">
      <span className="flex shrink-0 items-center gap-2 border-r border-line bg-panel2 px-3 font-display text-[9.5px] tracking-[0.24em] text-amber">
        <span className="led bg-amber shadow-[0_0_7px_rgba(255,180,58,0.9)]" />
        ТЕЛЕМЕТРИЯ
      </span>
      <div className="relative flex-1 overflow-hidden">
        <div className="ticker-track items-center font-mono text-[10.5px] tracking-wide text-dim">
          <span className="whitespace-nowrap pr-10">{line}</span>
          <span className="whitespace-nowrap pr-10" aria-hidden>
            {line}
          </span>
        </div>
      </div>
      <span className="hidden shrink-0 items-center border-l border-line px-3 font-mono text-[9.5px] tracking-wider text-faint md:flex">
        канал охраняемый · ФСТЭК-Б
      </span>
    </footer>
  );
}
