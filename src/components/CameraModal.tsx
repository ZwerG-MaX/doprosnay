import { useEffect, useRef, useState } from "react";
import { CAMERAS, type EventType } from "../lib/data";
import { useNow, useInterval, fmtClock, randInt } from "../lib/hooks";
import { Feed } from "./CameraFeed";
import { IcSnap, IcExpand, IcClose, IcChevL, IcChevR, IcPopout } from "./Icons";

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
  const [rate, setRate] = useState(() => randInt(3700, 4700));
  const stageRef = useRef<HTMLDivElement>(null);
  const glitchTimer = useRef(0);
  const now = useNow(500);

  useInterval(() => setRate(randInt(3600, 4800)), 2400);

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
    const name = `${cam.num.replace(" ", "")}_popup_${fmtClock(new Date()).replace(/:/g, "-")}.png`;
    onToast(`Кадр сохранён: ${name}`);
    onEvent("video", `Снимок кадра ${cam.num} (popup) → архив MACROSCOP`);
  };

  const toggleFull = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      el.requestFullscreen?.().catch(() => undefined);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") switchTo(prev.id);
      else if (e.key === "ArrowRight") switchTo(next.id);
      else if (e.key >= "1" && e.key <= "3") {
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

  const btn =
    "flex h-8 items-center gap-1.5 rounded-sm border font-mono text-[10px] tracking-widest transition-all active:scale-[0.97]";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/78 backdrop-blur-[3px]" onClick={onClose} />

      <div className="rise relative flex max-h-full w-full max-w-5xl flex-col rounded-md border border-line2 bg-panel shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        {/* шапка */}
        <header className="flex h-11 shrink-0 items-center gap-2.5 rounded-t-md border-b border-line bg-panel2/80 px-3.5">
          <span className="led blink-rec bg-rec shadow-[0_0_8px_rgba(255,59,78,0.9)]" />
          <h3 className="font-display text-[12px] tracking-[0.18em] text-fg">
            {cam.num} <span className="text-dim">· {cam.label}</span>
          </h3>
          <span className="hidden font-mono text-[10px] text-faint sm:block">
            увеличенный просмотр · MACROSCOP
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggleFull}
              title="На весь экран"
              className="grid h-7 w-7 place-items-center rounded-sm border border-line bg-panel2 text-dim transition-all hover:border-line2 hover:text-hud active:scale-95"
            >
              <IcExpand className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              title="Закрыть (ESC)"
              className="grid h-7 w-7 place-items-center rounded-sm border border-line bg-panel2 text-dim transition-all hover:border-rec/60 hover:text-rec active:scale-95"
            >
              <IcClose className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* видео */}
        <div ref={stageRef} className="relative m-2.5 aspect-video shrink-0 overflow-hidden bg-black">
          <Feed cam={cam} rate={rate} now={now} big glitch={glitch} idx={idx} />
          {flash && <div className="flash-anim pointer-events-none absolute inset-0 z-10 bg-white" />}
        </div>

        {/* параметры потока */}
        <div className="mx-2.5 grid shrink-0 grid-cols-2 gap-2 md:grid-cols-4">
          <div className="col-span-2 rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
            <div className="font-mono text-[8.5px] tracking-[0.2em] text-faint">ПОТОК · RTSP</div>
            <div className="truncate font-mono text-[10.5px] text-hud">{cam.rtsp}</div>
          </div>
          <div className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
            <div className="font-mono text-[8.5px] tracking-[0.2em] text-faint">РАЗРЕШЕНИЕ</div>
            <div className="font-mono text-[10.5px] text-fg">{RES[cam.id] ?? "—"}</div>
          </div>
          <div className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
            <div className="font-mono text-[8.5px] tracking-[0.2em] text-faint">БИТРЕЙТ</div>
            <div className="font-mono text-[10.5px] text-live tabular-nums">
              {(rate / 1000).toFixed(2)} Мбит/с
            </div>
          </div>
          <div className="col-span-2 rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
            <div className="font-mono text-[8.5px] tracking-[0.2em] text-faint">АРХИВ · NAS-2</div>
            <div className="truncate font-mono text-[10.5px] text-dim">
              /vol/record/dopros2/{cam.num.toLowerCase().replace(" ", "_")}/2026-02-11/
            </div>
          </div>
          <div className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
            <div className="font-mono text-[8.5px] tracking-[0.2em] text-faint">КОДЕК</div>
            <div className="font-mono text-[10.5px] text-fg">H.265 · 25 к/с</div>
          </div>
          <div className="rounded-sm border border-line bg-panel2 px-2.5 py-1.5">
            <div className="font-mono text-[8.5px] tracking-[0.2em] text-faint">ЗАПИСЬ</div>
            <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-rec">
              <span className="led blink-rec bg-rec" /> ИДЁТ
            </div>
          </div>
        </div>

        {/* управление */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 p-2.5">
          <button
            onClick={() => switchTo(prev.id)}
            title={`← · ${prev.num}`}
            className={`${btn} border-line bg-panel2 px-2.5 text-dim hover:border-line2 hover:text-fg`}
          >
            <IcChevL className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{prev.num}</span>
          </button>
          <span className="font-mono text-[10px] tracking-wider text-faint">
            ← → или 1–3 · переключение
          </span>
          <button
            onClick={() => switchTo(next.id)}
            title={`→ · ${next.num}`}
            className={`${btn} border-line bg-panel2 px-2.5 text-dim hover:border-line2 hover:text-fg`}
          >
            <span className="hidden sm:inline">{next.num}</span>
            <IcChevR className="h-3.5 w-3.5" />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={snapshot}
              className={`${btn} border-hud/50 bg-hud/10 px-3 text-hud hover:bg-hud/20`}
            >
              <IcSnap className="h-3.5 w-3.5" />
              СНИМОК
            </button>
            <button
              onClick={onClose}
              className={`${btn} border-line2 bg-panel2 px-3 text-dim hover:border-rec/60 hover:text-rec`}
            >
              <IcPopout className="h-3.5 w-3.5" />
              ЗАКРЫТЬ · ESC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
