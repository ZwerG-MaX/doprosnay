import { useState } from "react";
import { useInterval, randInt } from "../lib/hooks";
import { useStore, mumbleUrlOf } from "../lib/store";

function genStats(hosts: { vms: string; mumble: string; docs: string; cams: number; on: { vms: boolean; mu: boolean; oo: boolean } }): string[] {
  return [
    ...Array.from({ length: hosts.cams }, (_, i) => `CAM 0${i + 1} ${hosts.on.vms ? (randInt(3600, 4800) / 1000).toFixed(2) : "—"} Мбит/с`),
    `потери пакетов ${(Math.random() * 0.6).toFixed(2)}%`,
    hosts.on.mu ? `Mumble ${randInt(17, 42)} мс` : "Mumble ОТКЛ",
    `CPU ${randInt(21, 46)}%`,
    hosts.on.vms ? `архив: запись ${randInt(9, 16)} МБ/с` : "архив: приостановлен",
    `хранилище 214,6 ГБ из 4 ТБ`,
    hosts.vms,
    hosts.mumble,
    hosts.docs,
  ];
}

export function Ticker() {
  const { config, room } = useStore();
  const hosts = {
    vms: config.macroscop.enabled ? config.macroscop.host : `${config.macroscop.host} · ОТКЛ`,
    mumble: config.mumble.enabled ? mumbleUrlOf(config) : "mumble · ОТКЛ",
    docs: config.onlyoffice.enabled ? config.onlyoffice.dsUrl : `${config.onlyoffice.dsUrl} · ОТКЛ`,
    cams: room.cameras.length,
    on: { vms: config.macroscop.enabled, mu: config.mumble.enabled, oo: config.onlyoffice.enabled },
  };
  const [stats, setStats] = useState<string[]>(() => genStats(hosts));
  useInterval(() => setStats(genStats(hosts)), 2400);
  const line = stats.join("   ··   ");

  return (
    <footer className="flex h-8 shrink-0 items-stretch overflow-hidden border-t border-line bg-panel/95">
      <span className="flex shrink-0 items-center gap-2 border-r border-line bg-panel2 px-3 font-display text-[9.5px] tracking-[0.24em] text-amber">
        <span className="led bg-amber shadow-[0_0_7px_rgba(255,138,61,0.9)]" />
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
