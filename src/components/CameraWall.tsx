import { useEffect, useRef, useState } from "react";
import { CAMERAS, VMS_HOST, type EventType } from "../lib/data";
import { useNow, useInterval, fmtClock, randInt } from "../lib/hooks";
import { Panel } from "./Panel";
import { Feed } from "./CameraFeed";
import { CameraModal } from "./CameraModal";
import { IcSnap, IcExpand, IcGrid, IcSingle, IcVideoOff, IcPopout } from "./Icons";

interface Props {
  onEvent: (t: EventType, s: string) => void;
  onToast: (s: string) => void;
}

export function CameraWall({ onEvent, onToast }: Props) {
  const [activeId, setActiveId] = useState(CAMERAS[0].id);
  const [layout, setLayout] = useState<"main" | "grid">("main");
  const [glitch, setGlitch] = useState(false);
  const [flash, setFlash] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);
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

  const openModal = (id: string) => {
    setModalId(id);
    const c = CAMERAS.find((x) => x.id === id);
    if (c) onEvent("video", `Открыто всплывающее окно: ${c.num} · ${c.label}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalId) return;
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
  }, [activeId, modalId]);

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
          <button className={iconBtn} onClick={() => openModal(activeId)} title="Камера во всплывающем окне">
            <IcPopout className="h-4 w-4" />
          </button>
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
            <div
              ref={stageRef}
              onDoubleClick={() => openModal(activeId)}
              title="Двойной клик — всплывающее окно"
              className="relative m-2.5 mb-0 aspect-video min-h-0 shrink cursor-zoom-in bg-black lg:aspect-auto lg:flex-1 lg:shrink"
            >
              <Feed cam={active} rate={rates[activeIdx]} now={now} big glitch={glitch} idx={activeIdx} />
              {flash && <div className="flash-anim pointer-events-none absolute inset-0 z-10 bg-white" />}
            </div>
            <div className="grid shrink-0 grid-cols-3 gap-2 p-2.5">
              {CAMERAS.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => switchCam(c.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    openModal(c.id);
                  }}
                  className={`relative aspect-video overflow-hidden rounded-sm border text-left transition-all duration-200 ${
                    c.id === activeId
                      ? "border-hud shadow-[0_0_16px_rgba(69,200,255,0.25)]"
                      : "border-line opacity-75 hover:border-line2 hover:opacity-100"
                  }`}
                  title={`${c.num} · ${c.label} (клавиша ${i + 1}, 2× клик — popup)`}
                >
                  <Feed cam={c} rate={rates[i]} now={now} idx={i} />
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(c.id);
                    }}
                    title="Открыть во всплывающем окне"
                    className="absolute bottom-1.5 left-1.5 z-10 grid h-6 w-6 cursor-pointer place-items-center rounded-sm border border-line2 bg-black/60 text-dim opacity-0 transition-all hover:border-hud/60 hover:text-hud group-hover:opacity-100"
                  >
                    <IcPopout className="h-3.5 w-3.5" />
                  </span>
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
                onDoubleClick={() => openModal(c.id)}
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
          <span>1–3 — камеры · 2× клик — popup · SPACE — тангента</span>
        </div>
      </div>

      {modalId && (
        <CameraModal
          camId={modalId}
          onSwitch={(id) => {
            setModalId(id);
            switchCam(id);
          }}
          onClose={() => setModalId(null)}
          onEvent={onEvent}
          onToast={onToast}
        />
      )}
    </Panel>
  );
}
