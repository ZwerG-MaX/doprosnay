import { useEffect, useRef } from "react";
import type { CameraDef } from "../lib/data";
import { fmtClock, fmtDate } from "../lib/hooks";
import { IcSignal } from "./Icons";

/* ------- «живой» шум CCTV на canvas ------- */
export function Noise({ opacity = 0.06, fps = 12 }: { opacity?: number; fps?: number }) {
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

export interface FeedProps {
  cam: CameraDef;
  rate: number;
  now: Date;
  big?: boolean;
  glitch?: boolean;
  idx: number;
}

export function Feed({ cam, rate, now, big, glitch, idx }: FeedProps) {
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
