import { useEffect, useRef, useState } from "react";
import { CAMERAS, type EventType } from "../lib/data";
import { useNow, useInterval, fmtClock, fmtDate, randInt } from "../lib/hooks";
import { Feed } from "./CameraFeed";
import { IcSnap, IcClose, IcSignal, IcCam } from "./Icons";

const RES: Record<string, string> = {
  cam1: "2560×1440",
  cam2: "1920×1080 · PTZ",
  cam3: "2560×1440",
};

interface Props {
  camId: string;
  onSwitch: (id: string) => void;
  onClose: () => void;
  onEvent: (t: EventType, s: string) => void;
  onToast: (s: string) => void;
}

export function CameraModal({ camId, onSwitch, onClose, onEvent, onToast }: Props) {
  const [glitch, setGlitch] = useState(false);
  const [flash, setFlash] = useState(false);
  const [rates, setRates] = useState<number[]>(() => CAMERAS.map(() => randInt(3700, 4700)));
  const glitchTimer = useRef(0);
  const now = useNow(500);

  useInterval(() => setRates(CAMERAS.map(() => randInt(3600, 4800))), 2200);

  const idx = Math.max(0, CAMERAS.findIndex((c) => c.id === camId));
  const cam = CAMERAS[idx];
  const prev = CAMERAS[(idx + CAMERAS.length - 1) % CAMERAS.length];
  const next = CAMERAS[(idx + 1) % CAMERAS.length];

  const switchTo = (id: string) => {
    if (id === camId) return;
    setGlitch(true);
    window.clearTimeout(glitchTimer.current);
    glitchTimer.current = window.setTimeout(() => setGlitch(false), 430);
    onSwitch(id);
  };

  const snapshot = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 520);
    const name = `${cam.num.replace(" ", "")}_full_${fmtClock(new Date()).replace(/:/g, "-")}.png`;
    onToast(`Кадр сохранён: ${name}`);
    onEvent("video", `Снимок кадра ${cam.num} (полный экран) → архив MACROSCOP`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") switchTo(prev.id);
      else if (e.key === "ArrowRight") switchTo(next.id);
      else if (e.key >= "1" && e.key <= String(CAMERAS.length)) {
        const c = CAMERAS[Number(e.key) - 1];
        if (c) switchTo(c.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(glitchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camId]);

  const iconBtn =
    "grid h-8 w-8 place-items-center rounded-sm border transition-all active:scale-95";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      {/* ── верхняя панель ── */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line2 bg-panel/95 px-3.5">
        <span className="led blink-rec bg-rec shadow-[0_0_8px_rgba(255,59,78,0.9)]" />
        <div className="leading-none">
          <div className="font-display text-[13px] tracking-[0.16em] text-fg">
            {cam.num} <span className="text-dim">· {cam.label}</span>
          </div>
          <div className="mt-1 font-mono text-[9px] tracking-wider text-faint">
            ПОЛНОЭКРАННЫЙ ПРОСМОТР · MACROSCOP VMS-2
          </div>
        </div>

        {/* мета потока */}
        <div className="mx-auto hidden items-center gap-2 lg:flex">
          <span className="flex items-center gap-1.5 rounded-sm border border-line bg-panel2 px-2 py-1 font-mono text-[9.5px] tracking-wider text-dim">
            <IcSignal className="h-3 w-3 text-live" />
            {RES[cam.id] ?? "—"} · H.265
          </span>
          <span className="max-w-[300px] truncate rounded-sm border border-line bg-panel2 px-2 py-1 font-mono text-[9.5px] text-hud">
            {cam.rtsp}
          </span>
          <span className="rounded-sm border border-line bg-panel2 px-2 py-1 font-mono text-[9.5px] text-live tabular-nums">
            {(rates[idx] / 1000).toFixed(2)} Мбит/с
          </span>
          <span className="rounded-sm border border-rec/40 bg-rec/10 px-2 py-1 font-mono text-[9.5px] font-semibold tracking-widest text-rec">
            REC {fmtDate(now)} {fmtClock(now)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <button
            onClick={snapshot}
            title="Снимок кадра"
            className={`${iconBtn} border-hud/50 bg-hud/10 text-hud hover:bg-hud/20`}
          >
            <IcSnap className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            title="Закрыть (ESC)"
            className={`${iconBtn} border-line bg-panel2 text-dim hover:border-rec/60 hover:text-rec`}
          >
            <IcClose className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ── видео на весь экран ── */}
      <div className="relative min-h-0 flex-1">
        <Feed cam={cam} rate={rates[idx]} now={now} big glitch={glitch} idx={idx} />
        {flash && <div className="flash-anim pointer-events-none absolute inset-0 z-10 bg-white" />}
      </div>

      {/* ── нижняя строка выбора камер ── */}
      <div className="shrink-0 border-t border-line2 bg-panel/95">
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="hidden shrink-0 items-center gap-1.5 font-display text-[10px] tracking-[0.22em] text-amber sm:flex">
            <IcCam className="h-3.5 w-3.5" />
            КАМЕРЫ
          </span>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
            {CAMERAS.map((c, i) => {
              const isActive = c.id === camId;
              return (
                <button
                  key={c.id}
                  onClick={() => switchTo(c.id)}
                  title={`${c.num} · ${c.label} (клавиша ${i + 1})`}
                  className={`group relative aspect-video overflow-hidden rounded-sm border transition-all duration-200 ${
                    isActive
                      ? "w-[190px] border-hud shadow-[0_0_18px_rgba(69,200,255,0.35)]"
                      : "w-[150px] border-line opacity-60 hover:border-line2 hover:opacity-100"
                  }`}
                >
                  <Feed cam={c} rate={rates[i]} now={now} idx={i} />
                  {/* метка выбора */}
                  <span
                    className={`absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 py-0.5 font-mono text-[8.5px] tracking-widest backdrop-blur-[2px] ${
                      isActive ? "bg-hud/25 text-hud" : "bg-black/50 text-dim"
                    }`}
                  >
                    <span>{c.num}</span>
                    {isActive ? "НА ЭКРАНЕ" : `${i + 1}`}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="hidden shrink-0 font-mono text-[9.5px] tracking-wider text-faint md:block">
            ← → или 1–{CAMERAS.length} · ESC — закрыть
          </span>
        </div>
      </div>
    </div>
  );
}
