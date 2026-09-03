import { useEffect, useRef, useState } from "react";
import { CAMERAS, VMS_HOST, type EventType } from "../lib/data";
import { useNow, useInterval, randInt } from "../lib/hooks";
import { Panel } from "./Panel";
import { Feed } from "./CameraFeed";
import { CameraModal } from "./CameraModal";
import { IcPopout } from "./Icons";

interface Props {
  onEvent: (t: EventType, s: string) => void;
  onToast: (s: string) => void;
}

/* Видеостена: только 3 камеры. Снимки, полный экран, метаданные — во всплывающем окне. */
export function CameraWall({ onEvent, onToast }: Props) {
  const [activeId, setActiveId] = useState(CAMERAS[0].id);
  const [glitch, setGlitch] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);
  const [rates, setRates] = useState<number[]>(() => CAMERAS.map(() => randInt(3800, 4600)));
  const glitchTimer = useRef(0);
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
    onEvent("video", "Всплывающее окно: открыт расширенный просмотр камеры");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable))
        return;
      if (modalId) return; // в окне камеры клавиши обрабатывает само окно
      if (e.key === "1") switchCam(CAMERAS[0].id);
      if (e.key === "2") switchCam(CAMERAS[1].id);
      if (e.key === "3") switchCam(CAMERAS[2].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, modalId]);

  return (
    <Panel
      title="ВИДЕОСТЕНА"
      sub={`MACROSCOP · ${VMS_HOST} · 3 камеры`}
      ledClass="bg-hud shadow-[0_0_8px_rgba(0,176,240,0.85)]"
      className="min-h-0 flex-1"
      delay={40}
      right={
        <>
          <span className="hidden rounded-full border border-line bg-panel2 px-2.5 py-0.5 font-mono text-[9.5px] tracking-wider text-dim md:inline">
            3 потока · 25 fps · H.265
          </span>
          <button
            onClick={() => openModal(activeId)}
            title="Всплывающее окно: расширенный просмотр, снимки, полный экран"
            className="flex h-7 items-center gap-1.5 rounded-md border border-line bg-panel2 px-2 font-mono text-[9.5px] tracking-widest text-dim transition-all hover:border-hud/60 hover:text-hud active:scale-95"
          >
            <IcPopout className="h-3.5 w-3.5" />
            ОКНО
          </button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* основной монитор */}
        <div
          onDoubleClick={() => openModal(activeId)}
          title="Двойной клик — всплывающее окно"
          className="relative m-2.5 mb-0 aspect-video min-h-0 shrink cursor-zoom-in overflow-hidden bg-black lg:aspect-auto lg:flex-1"
        >
          <Feed cam={active} rate={rates[activeIdx]} now={now} big glitch={glitch} idx={activeIdx} />
        </div>

        {/* три камеры */}
        <div className="grid shrink-0 grid-cols-3 gap-2 p-2.5">
          {CAMERAS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => switchCam(c.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openModal(c.id);
              }}
              className={`group relative aspect-video overflow-hidden rounded-md border text-left transition-all duration-200 ${
                c.id === activeId
                  ? "border-hud shadow-[0_0_16px_rgba(0,176,240,0.3)]"
                  : "border-line opacity-75 hover:border-line2 hover:opacity-100"
              }`}
              title={`${c.num} · ${c.label} (клавиша ${i + 1}, 2× клик — окно)`}
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
                className="absolute bottom-1.5 left-1.5 z-10 grid h-6 w-6 cursor-pointer place-items-center rounded-md border border-line2 bg-black/60 text-dim opacity-0 transition-all hover:border-hud/60 hover:text-hud group-hover:opacity-100"
              >
                <IcPopout className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>

        <div className="hidden shrink-0 items-center justify-between px-3 pb-2 font-mono text-[9.5px] tracking-wider text-faint lg:flex">
          <span className="truncate">{active.rtsp}</span>
          <span className="shrink-0 pl-3">1–3 — переключение · 2× клик — всплывающее окно</span>
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
