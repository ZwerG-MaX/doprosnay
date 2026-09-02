import { useEffect, useRef, useState } from "react";
import { CAMERAS, VMS_HOST, type CameraDef, type EventType } from "../lib/data";
import { useNow, useInterval, fmtClock, fmtDate, randInt } from "../lib/hooks";
import { Panel } from "./Panel";
import { IcSnap, IcExpand, IcGrid, IcSingle, IcVideoOff, IcSignal } from "./Icons";

/* ------- «живой» шум CCTV на canvas ------- */
function Noise({ opacity = 0.06, fps = 12 }: { opacity?: number; fps?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = 140;
    const H = 80;
    cv.width = W;
    cv.height = H;
    const img = ctx.createImageData(W, H);
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 1000 / fps) return;
      last = t;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [fps]);
  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity, imageRendering: "pixelated" }}
    />
  );
}

const CORNERS = [
  "top-2 left-2 border-t-2 border-l-2",
  "top-2 right-2 border-t-2 border-r-2",
  "bottom-2 left-2 border-b-2 border-l-2",
  "bottom-2 right-2 border-b-2 border-r-2",
];

interface FeedProps {
  cam: CameraDef;
  rate: number;
  now: Date;
  big?: boolean;
  glitch?: boolean;
  idx: number;
}

function Feed({ cam, rate, now, big, glitch, idx }: FeedProps) {
  return (
    <div className="group relative h-full w-full overflow-hidden bg-black">
      <img
        src={cam.src}
        alt={`${cam.num} — ${cam.label}`}
        draggable={false}
        className={`absolute inset-0 h-full w-full select-none object-cover ${cam.kb} ${
          glitch && big ? "glitching" : ""
        }`}
      />
      <div className="scanlines absolute inset-0" />
      <div className="vignette absolute inset-0" />
      <Noise opacity={big ? 0.055 : 0.08} fps={big ? 12 : 8} />

      {glitch && big && (
        <>
          <div className="glitch-bars absolute inset-0" />
          <Noise opacity={0.5} fps={30} />
        </>
      )}

      {/* HUD */}
      <div className="absolute left-2.5 top-2 flex items-center gap-2 rounded-sm bg-black/45 px-2 py-1 backdrop-blur-[2px]">
        <span className="led blink-rec bg-rec" />
        <span className="font-mono text-[10px] font-semibold tracking-widest text-fg">
          {cam.num} <span className="text-dim">· {cam.label}</span>
        </span>
      </div>

      <div className="absolute right-2.5 top-2 flex items-center gap-2 rounded-sm bg-black/45 px-2 py-1 backdrop-blur-[2px]">
        <span className="font-mono text-[9px] font-semibold tracking-[0.2em] text-live">LIVE</span>
        <IcSignal className="h-3.5 w-3.5 text-live" />
      </div>

      {big && CORNERS.map((c) => (
        <span key={c} className={`pointer-events-none absolute h-5 w-5 border-hud/60 ${c}`} />
      ))}

      <div className="absolute bottom-2 left-2.5 rounded-sm bg-black/45 px-2 py-1 font-mono text-[10px] tracking-widest text-fg tabular-nums backdrop-blur-[2px]">
        {fmtDate(now)} <span className="text-hud">{fmtClock(now)}</span>
      </div>

      <div className="absolute bottom-2 right-2.5 hidden rounded-sm bg-black/45 px-2 py-1 font-mono text-[9.5px] tracking-wider text-dim backdrop-blur-[2px] sm:block">
        {(rate / 1000).toFixed(1)} Мбит/с · 25 к/с · H.265
      </div>

      {big && (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 text-center font-display text-[10px] tracking-[0.5em] text-white/25">
          MACROSCOP
        </div>
      )}

      {!big && (
        <span className="absolute right-1.5 top-1.5 rounded-sm border border-line2 bg-black/50 px-1 font-mono text-[9px] text-dim">
          {idx + 1}
        </span>
      )}
    </div>
  );
}

interface Props {
  onEvent: (t: EventType, s: string) => void;
  onToast: (s: string) => void;
}

export function CameraWall({ onEvent, onToast }: Props) {
  const [activeId, setActiveId] = useState(CAMERAS[0].id);
  const [layout, setLayout] = useState<"main" | "grid">("main");
  const [glitch, setGlitch] = useState(false);
  const [flash, setFlash] = useState(false);
  const [rates, setRates] = useState<number[]>(() => CAMERAS.map(() => randInt(3800, 4600)));
  const stageRef = useRef<HTMLDivElement>(null);
  const glitchTimer = useRef<number>(0);
  const now = useNow(500);

  const activeIdx = Math.max(0, CAMERAS.findIndex((c) => c.id === activeId));
  const active = CAMERAS[activeIdx];

  useInterval(() => setRates(CAMERAS.map(() => randInt(3600, 4800))), 2200);

  const switchCam = (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
    setGlitch(true);
    window.clearTimeout(glitchTimer.current);
    glitchTimer.current = window.setTimeout(() => setGlitch(false), 420);
    const c = CAMERAS.find((x) => x.id === id);
    if (c) onEvent("video", `Основной монитор: ${c.num} · ${c.label}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable))
        return;
      if (e.key === "1") switchCam(CAMERAS[0].id);
      if (e.key === "2") switchCam(CAMERAS[1].id);
      if (e.key === "3") switchCam(CAMERAS[2].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const snapshot = () => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 520);
    const name = `${active.num.replace(" ", "")}_${fmtClock(new Date()).replace(/:/g, "-")}.png`;
    onToast(`Кадр сохранён: ${name}`);
    onEvent("video", `Снимок кадра ${active.num} → архив MACROSCOP`);
  };

  const toggleFull = () => {
    const el = stageRef.current;
    if (!el) return;
    const isFs = !!document.fullscreenElement;
    if (isFs) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      el.requestFullscreen?.().catch(() => undefined);
    }
    onEvent("video", isFs ? "Выход из полноэкранного режима" : "Видеостена на весь экран");
  };

  const iconBtn =
    "grid h-7 w-7 place-items-center rounded-sm border border-line bg-panel2 text-dim transition-all hover:border-line2 hover:text-hud active:scale-95";

  return (
    <Panel
      title="ВИДЕОСТЕНА"
      sub={`MACROSCOP · ${VMS_HOST} · 3 потока`}
      ledClass="bg-hud shadow-[0_0_8px_rgba(69,200,255,0.8)]"
      className="min-h-0 flex-1"
      delay={40}
      right={
        <>
          <button
            className={`${iconBtn} ${layout === "main" ? "!border-hud/60 !text-hud" : ""}`}
            onClick={() => setLayout("main")}
            title="Основной монитор + миниатюры"
          >
            <IcSingle className="h-4 w-4" />
          </button>
          <button
            className={`${iconBtn} ${layout === "grid" ? "!border-hud/60 !text-hud" : ""}`}
            onClick={() => setLayout("grid")}
            title="Сетка 2×2"
          >
            <IcGrid className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-line" />
          <button className={iconBtn} onClick={snapshot} title="Снимок кадра">
            <IcSnap className="h-4 w-4" />
          </button>
          <button className={iconBtn} onClick={toggleFull} title="Во весь экран">
            <IcExpand className="h-4 w-4" />
          </button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {layout === "main" ? (
          <>
            <div ref={stageRef} className="relative m-2.5 mb-0 aspect-video min-h-0 shrink bg-black lg:aspect-auto lg:flex-1 lg:shrink">
              <Feed cam={active} rate={rates[activeIdx]} now={now} big glitch={glitch} idx={activeIdx} />
              {flash && <div className="flash-anim pointer-events-none absolute inset-0 z-10 bg-white" />}
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-2 p-2.5">
              {CAMERAS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => switchCam(c.id)}
                  className={`relative aspect-video overflow-hidden rounded-sm border text-left transition-all duration-200 ${
                    c.id === activeId
                      ? "border-hud shadow-[0_0_16px_rgba(69,200,255,0.25)]"
                      : "border-line opacity-75 hover:border-line2 hover:opacity-100"
                  }`}
                  title={`${c.num} · ${c.label} (клавиша ${i + 1})`}
                >
                  <Feed cam={c} rate={rates[i]} now={now} idx={i} />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div ref={stageRef} className="grid min-h-0 flex-1 grid-cols-1 gap-2 p-2.5 sm:grid-cols-2">
            {CAMERAS.map((c, i) => (
              <div
                key={c.id}
                onClick={() => switchCam(c.id)}
                className={`relative min-h-[160px] cursor-pointer overflow-hidden rounded-sm border transition-all ${
                  c.id === activeId
                    ? "border-hud shadow-[0_0_16px_rgba(69,200,255,0.25)]"
                    : "border-line hover:border-line2"
                }`}
              >
                <Feed cam={c} rate={rates[i]} now={now} big={c.id === activeId} glitch={glitch && c.id === activeId} idx={i} />
              </div>
            ))}
            <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-line2 bg-panel2/50 text-faint">
              <IcVideoOff className="h-7 w-7" />
              <span className="font-display text-[10px] tracking-[0.24em]">CAM 04 · РЕЗЕРВ</span>
              <span className="font-mono text-[9.5px]">канал не подключён</span>
            </div>
          </div>
        )}
        <div className="hidden shrink-0 items-center justify-between px-3 pb-2 font-mono text-[9.5px] tracking-wider text-faint lg:flex">
          <span>{active.rtsp}</span>
          <span>клавиши 1–3 — переключение · SPACE — тангента</span>
        </div>
      </div>
    </Panel>
  );
}
