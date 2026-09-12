import { useEffect, useMemo, useState } from "react";
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
  const [modalId, setModalId] = useState<string | null>(null);
  const [rates, setRates] = useState<number[]>(() => cams.map(() => randInt(3800, 4600)));
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
    if (id !== activeId) setActiveId(id);
    const c = cams.find((x) => x.id === id);
    if (c && id !== activeId) onEvent("video", `Камера в фокусе: ${c.num} · ${c.label} (${room.name})`);
  };

  /* горячие клавиши 1–3 — открыть всплывающее окно камеры */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < cams.length) {
        switchCam(cams[i].id);
        openModal(cams[i].id);
      }
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

        {/* только миниатюры камер — увеличенный просмотр во всплывающем окне */}
        <div
          className={`grid min-h-0 flex-1 auto-rows-fr gap-2.5 p-2.5 ${
            cams.length === 2 ? "grid-cols-2" : "grid-cols-3"
          }`}
        >
          {cams.map((c, i) => (
            <button
              key={`${room.id}-${c.id}`}
              onClick={() => {
                switchCam(c.id);
                openModal(c.id);
              }}
              className={`group relative min-h-0 overflow-hidden rounded-md border text-left transition-all duration-200 ${
                c.id === activeId
                  ? "border-hud shadow-[0_0_16px_rgba(0,176,240,0.25)]"
                  : "border-line opacity-80 hover:border-line2 hover:opacity-100 hover:shadow-[0_0_14px_rgba(0,176,240,0.12)]"
              }`}
              title={`${c.num} · ${c.label} — клик откроет всплывающее окно (клавиша ${i + 1})`}
            >
              <Feed cam={c} rate={rates[i]} now={now} idx={i} />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/25 group-hover:opacity-100">
                <span className="flex items-center gap-1.5 rounded-md border border-hud/60 bg-black/70 px-2.5 py-1.5 font-mono text-[9.5px] tracking-widest text-hud shadow-[0_0_18px_rgba(0,176,240,0.35)]">
                  <IcPopout className="h-3.5 w-3.5" />
                  ОТКРЫТЬ
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="hidden shrink-0 items-center justify-between px-3 pb-2 font-mono text-[9.5px] tracking-wider text-faint lg:flex">
          <span className="truncate">{active?.rtsp}</span>
          <span className="shrink-0 pl-3">1–{cams.length} или клик — всплывающее окно камеры</span>
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
