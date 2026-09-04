import { useEffect, useMemo, useRef, useState } from "react";
import { type EventType, type CameraDef } from "../lib/data";
import { useNow, useInterval, randInt } from "../lib/hooks";
import { useStore } from "../lib/store";
import type { PttApi } from "../lib/usePtt";
import { Panel } from "./Panel";
import { Feed } from "./CameraFeed";
import { CameraModal } from "./CameraModal";
import { IcPopout, IcCam } from "./Icons";

interface Props {
  onEvent: (t: EventType, s: string) => void;
  onToast: (s: string) => void;
  ptt: PttApi;
}

/* Видеостена: камеры активной комнаты. Всё расширенное — во всплывающем окне. */
export function CameraWall({ onEvent, onToast, ptt }: Props) {
  const { config, room, myRooms, roomId, setRoomId } = useStore();

  /* собираем RTSP-адреса из конфигурации MACROSCOP */
  const cams: CameraDef[] = useMemo(
    () =>
      room.cameras.map((c) => ({
        ...c,
        rtsp: `${config.macroscop.proto}://${config.macroscop.host}:${config.macroscop.port}/macroscop/${room.code.toLowerCase()}/${c.id}`,
      })),
    [room, config.macroscop],
  );

  const [activeId, setActiveId] = useState(cams[0]?.id ?? "cam01");
  const [glitch, setGlitch] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);
  const [rates, setRates] = useState<number[]>(() => cams.map(() => randInt(3800, 4600)));
  const glitchTimer = useRef(0);
  const now = useNow(500);

  /* смена комнаты — сброс на первую камеру */
  useEffect(() => {
    setActiveId(cams[0]?.id ?? "cam01");
    setRates(cams.map(() => randInt(3800, 4600)));
  }, [room.id, cams.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeIdx = Math.max(0, cams.findIndex((c) => c.id === activeId));
  const active = cams[activeIdx] ?? cams[0];

  useInterval(() => setRates(cams.map(() => randInt(3600, 4800))), 2200);

  const switchCam = (id: string) => {
    if (id === activeId) return;
    setActiveId(id);
    setGlitch(true);
    window.clearTimeout(glitchTimer.current);
    glitchTimer.current = window.setTimeout(() => setGlitch(false), 420);
    const c = cams.find((x) => x.id === id);
    if (c) onEvent("video", `Основной монитор переключён: ${c.num} · ${c.label} (${room.name})`);
  };

  /* горячие клавиши 1–3 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < cams.length) switchCam(cams[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cams, activeId]);

  const openModal = (id: string) => {
    setModalId(id);
    const c = cams.find((x) => x.id === id);
    if (c) onEvent("video", `Полноэкранный просмотр: ${c.num} (${room.name})`);
  };

  const vmsOff = !config.macroscop.enabled;

  return (
    <Panel
      title="ВИДЕОСТЕНА"
      sub={
        vmsOff
          ? "видеосервер MACROSCOP отключён администратором"
          : `${config.macroscop.host} · ${cams.length} потоков · MACROSCOP`
      }
      ledClass={
        vmsOff ? "bg-faint" : "bg-hud shadow-[0_0_8px_rgba(0,176,240,0.8)]"
      }
      className="min-h-0 flex-1"
      delay={40}
      right={
        <button
          onClick={() => openModal(active.id)}
          className="flex h-7 items-center gap-1.5 rounded-md border border-hud/50 bg-hud/10 px-2.5 font-mono text-[9.5px] tracking-widest text-hud transition-all hover:bg-hud/20 active:scale-95"
          title="Открыть всплывающее окно камер"
        >
          <IcPopout className="h-3.5 w-3.5" />
          ОКНО
        </button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {vmsOff && (
          <div className="mx-2.5 mt-2.5 flex items-center gap-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 font-mono text-[10px] tracking-wide text-amber">
            <IcCam className="h-3.5 w-3.5 shrink-0" />
            Видеосервер MACROSCOP отключён в настройках. Включите его в панели «Серверы» (админ).
          </div>
        )}
        {/* табы комнат (доступные по правам) */}
        {myRooms.length > 1 && (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto px-2.5 pt-2.5">
            {myRooms.map((r) => {
              const activeRoom = r.id === roomId;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    if (r.id !== roomId) {
                      setRoomId(r.id);
                      onEvent("sys", `Переключение на комнату «${r.name}» (${r.code})`);
                    }
                  }}
                  className={`flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 transition-all duration-150 active:scale-[0.97] ${
                    activeRoom
                      ? "border-hud/70 bg-hud/12 text-fg shadow-[0_0_14px_rgba(0,176,240,0.2)]"
                      : "border-line bg-panel2 text-dim hover:border-line2 hover:text-fg"
                  }`}
                >
                  <IcCam className={`h-3.5 w-3.5 ${activeRoom ? "text-hud" : "text-faint"}`} />
                  <span className="font-display text-[9.5px] tracking-[0.14em]">{r.code}</span>
                  <span className="hidden max-w-[110px] truncate font-mono text-[9px] text-faint sm:block">
                    {r.name}
                  </span>
                  <span className={`font-mono text-[8.5px] ${activeRoom ? "text-hud" : "text-faint"}`}>
                    {r.cameras.length} кам
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* основной монитор */}
        <div
          className="relative m-2.5 min-h-0 flex-1 cursor-pointer overflow-hidden rounded-md border border-line2"
          onDoubleClick={() => openModal(active.id)}
          title="Двойной клик — всплывающее окно"
        >
          {active && (
            <Feed cam={active} rate={rates[activeIdx]} now={now} big glitch={glitch} idx={activeIdx} />
          )}
        </div>

        {/* камеры комнаты */}
        <div className={`grid shrink-0 gap-2 p-2.5 pt-0 ${cams.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {cams.map((c, i) => (
            <button
              key={`${room.id}-${c.id}`}
              onClick={() => switchCam(c.id)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                openModal(c.id);
              }}
              className={`group relative aspect-video overflow-hidden rounded-md border text-left transition-all duration-200 ${
                c.id === activeId
                  ? "border-hud shadow-[0_0_16px_rgba(0,176,240,0.25)]"
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
          <span className="truncate">{active?.rtsp}</span>
          <span className="shrink-0 pl-3">1–{cams.length} — переключение · 2× клик — всплывающее окно</span>
        </div>
      </div>

      {modalId && (
        <CameraModal
          cameras={cams}
          camId={modalId}
          ptt={ptt}
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
