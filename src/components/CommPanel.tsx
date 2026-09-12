import { useRef, useState } from "react";
import { type EventType, type Observer, shortName } from "../lib/data";
import { useStore, mumbleUrlOf } from "../lib/store";
import { useInterval, randInt } from "../lib/hooks";
import { AudioConsole } from "./AudioConsole";
import type { PttApi } from "../lib/usePtt";
import { Panel } from "./Panel";
import { IcMic, IcMicOff, IcHeadOff, IcRadio, IcChevR, IcPlus, IcClose } from "./Icons";

export function Eq({ className = "text-amber" }: { className?: string }) {
  return (
    <span className={`eq ${className}`}>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

interface Props {
  connected: Observer[];
  online: boolean;
  ptt: PttApi;
  onJoin: () => void;
  onLeave: (o: Observer) => void;
  onEvent: (t: EventType, s: string) => void;
}

export function CommPanel({ connected, online, ptt, onJoin, onLeave, onEvent }: Props) {
  const { config, room, users, me } = useStore();
  const mumbleUrl = mumbleUrlOf(config);
  /* вместимость канала = все, у кого есть доступ к активной комнате */
  const roomCap = users.filter((u) => u.isAdmin || u.view.includes(room.id)).length;

  const [latency, setLatency] = useState(24);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 14 }, () => 6));
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const speakTimer = useRef<number>(0);

  useInterval(() => {
    if (online) setLatency(randInt(17, 42));
  }, 2400);

  /* индикатор уровня */
  useInterval(() => {
    setBars((prev) => prev.map(() => (ptt.tx ? randInt(14, 100) : randInt(4, 9))));
  }, 120);

  /* симуляция голосовой активности в канале */
  useInterval(() => {
    if (!online || Math.random() < 0.45) return;
    const pool = [101, 102, ...connected.filter((o) => !o.muted && o.n !== 1).map((o) => o.n)];
    setSpeakingId(pool[randInt(0, pool.length - 1)]);
    window.clearTimeout(speakTimer.current);
    speakTimer.current = window.setTimeout(() => setSpeakingId(null), 1700);
  }, 6200);

  const channelHead =
    "flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.18em] text-faint";

  const userRow = (
    keyVal: string,
    dot: string,
    label: string,
    name: string,
    speakKey: number,
    isMuted = false,
    onX?: () => void,
  ) => {
    const isSpeaking = speakingId === speakKey;
    return (
      <div
        key={keyVal}
        className={`group/row flex h-[22px] items-center gap-1.5 rounded-sm px-1.5 transition-colors ${
          isSpeaking ? "bg-raise text-fg" : "text-dim hover:bg-panel2/70"
        }`}
      >
        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: dot }} />
        <span className="font-mono text-[10px] font-semibold tracking-wide">{label}</span>
        <span className={`truncate text-[11px] ${isSpeaking ? "text-fg" : "text-dim"}`}>
          {name}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {isMuted ? (
            <IcMicOff className="h-3 w-3 text-rec/80" />
          ) : isSpeaking ? (
            <Eq className="text-live" />
          ) : (
            <IcMic className="h-3 w-3 text-faint" />
          )}
          {onX && (
            <button
              onClick={onX}
              title="Отключить от канала"
              className="hidden h-4 w-4 place-items-center rounded-sm text-faint transition-colors hover:bg-rec/15 hover:text-rec group-hover/row:grid"
            >
              <IcClose className="h-2.5 w-2.5" />
            </button>
          )}
        </span>
      </div>
    );
  };

  const disabledByAdmin = !config.mumble.enabled;

  return (
    <Panel
      title="АУДИОКАНАЛ · MUMBLE"
      sub={
        disabledByAdmin
          ? "сервер отключён администратором"
          : `${mumbleUrl} · канал «${room.mumbleChannel}»`
      }
      delay={90}
      className="min-h-0 lg:max-h-[420px]"
      ledClass={
        disabledByAdmin
          ? "bg-faint"
          : online
            ? "bg-live shadow-[0_0_8px_rgba(49,217,138,0.8)]"
            : "bg-amber shadow-[0_0_8px_rgba(255,138,61,0.8)] blink-rec"
      }
      right={
        <span className="flex items-center gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums ${
              disabledByAdmin ? "border-line bg-panel text-faint" : "border-line bg-raise text-dim"
            }`}
          >
            {disabledByAdmin ? "отключён" : online ? `${latency} мс` : "подключение…"}
          </span>
          {!disabledByAdmin && config.mumble.webUrl && (
            <button
              onClick={() => {
                setConsoleOpen(true);
                onEvent("audio", `Открыта аудиоконсоль mumble-web (канал «${room.mumbleChannel}»)`);
              }}
              title="Реальный голосовой клиент mumble-web (звук в браузере)"
              className="flex h-6 items-center gap-1.5 rounded-full border border-amber/50 bg-amber/10 px-2.5 font-mono text-[9.5px] tracking-wider text-amber transition-all hover:bg-amber/20 hover:shadow-[0_0_12px_rgba(255,138,61,0.3)] active:scale-95"
            >
              <IcRadio className="h-3 w-3" />
              АУДИОКОНСОЛЬ
            </button>
          )}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {disabledByAdmin && (
          <div className="flex items-center gap-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 font-mono text-[10px] tracking-wide text-amber">
            <IcMicOff className="h-3.5 w-3.5 shrink-0" />
            Аудиосервер Mumble отключён в настройках. Включите его в панели «Серверы» (админ).
          </div>
        )}
        {/* канал допросной */}
        <div>
          <div className={channelHead}>
            <IcChevR className="h-3 w-3" />
            {room.mumbleChannel.toUpperCase()} · ГРОМКАЯ СВЯЗЬ
          </div>
          <div className="mt-1 border-l-2 border-amber/50 pl-1">
            {userRow("s", "#ff8a3d", "SLD", "следователь · Ребров", 101)}
            {userRow("o", "#ff8a3d", "OPR", "оперативник · Ткачук", 102)}
          </div>
        </div>

        {/* наблюдатели — подключаются динамически */}
        <div>
          <div className="flex items-center justify-between">
            <div className={channelHead}>
              <IcChevR className="h-3 w-3" />
              НАБЛЮДАТЕЛИ · {connected.length} В КАНАЛЕ
            </div>
            <button
              onClick={onJoin}
              disabled={connected.length >= roomCap}
              title="Подключить наблюдателя"
              className="grid h-[18px] w-[18px] place-items-center rounded-sm border border-line bg-panel2 text-dim transition-all hover:border-hud/60 hover:text-hud active:scale-90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <IcPlus className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-1 grid grid-cols-1 border-l-2 border-hud/40 pl-1 sm:grid-cols-2 sm:gap-x-2">
            {connected.length === 0 && (
              <div className="col-span-full px-1.5 py-1 font-mono text-[10px] text-faint">
                канал пуст — нажмите «+», чтобы подключить наблюдателей
              </div>
            )}
            {connected.map((o) =>
              userRow(
                String(o.n),
                o.color,
                o.tag,
                o.n === 1 ? `${shortName(o.name)} (вы)` : shortName(o.name),
                o.n,
                o.muted,
                () => onLeave(o),
              ),
            )}
          </div>
        </div>

        {/* тангента (общая с полноэкранным видеоокном) */}
        <div className="mt-auto pt-1">
          <button
            onPointerDown={ptt.startTx}
            onPointerUp={ptt.stopTx}
            onPointerLeave={ptt.stopTx}
            onPointerCancel={ptt.stopTx}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex h-[72px] w-full touch-none select-none flex-col items-center justify-center gap-0.5 rounded-lg border font-display tracking-[0.22em] transition-all duration-150 ${
              ptt.tx
                ? "rt-grad-bg ptt-live border-transparent text-white"
                : "border-amber/60 bg-panel2 text-amber hover:border-amber hover:bg-amber/10 active:scale-[0.99]"
            }`}
          >
            <span className="flex items-center gap-2.5 text-[13px]">
              {ptt.tx ? <Eq className="text-white" /> : <IcRadio className="h-4.5 w-4.5" />}
              {ptt.tx ? "ПЕРЕДАЧА" : "PUSH-TO-TALK"}
            </span>
            <span
              className={`font-mono text-[9.5px] tracking-[0.14em] ${
                ptt.tx ? "text-white/80" : "text-dim"
              }`}
            >
              {ptt.tx ? `в эфире ${ptt.txSec} с → «${room.mumbleChannel}»` : "удерживайте кнопку или SPACE"}
            </span>
          </button>

          {/* индикатор уровня */}
          <div className="mt-2 flex h-7 items-end gap-[3px] rounded-md border border-line bg-panel2 px-2 py-1">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`flex-1 rounded-[1px] transition-all duration-100 ${
                  ptt.tx ? (h > 72 ? "bg-rec" : h > 40 ? "bg-amber" : "bg-live") : "bg-line2/70"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
            <span className="ml-1.5 w-[74px] shrink-0 text-right font-mono text-[9px] leading-none text-faint">
              {ptt.tx ? "TX · -6 дБ" : "RX · тишина"}
            </span>
          </div>

          {/* управление микрофоном */}
          <div className="mt-2 flex items-center gap-1.5">
            <button
              onClick={() => {
                ptt.toggleMute();
                onEvent("audio", ptt.muted ? "Микрофон включён" : "Микрофон выключен (mute)");
              }}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border font-mono text-[10px] tracking-widest transition-all active:scale-[0.98] ${
                ptt.muted
                  ? "border-rec/60 bg-rec/10 text-rec"
                  : "border-line bg-panel2 text-dim hover:border-line2 hover:text-fg"
              }`}
            >
              {ptt.muted ? <IcMicOff className="h-3.5 w-3.5" /> : <IcMic className="h-3.5 w-3.5" />}
              {ptt.muted ? "ВКЛ МИК" : "МИК ВКЛ"}
            </button>
            <button
              onClick={() => {
                ptt.toggleDeafen();
                onEvent(
                  "audio",
                  ptt.deafened ? "Прослушивание включено" : "Прослушивание отключено (deafen)",
                );
              }}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border font-mono text-[10px] tracking-widest transition-all active:scale-[0.98] ${
                ptt.deafened
                  ? "border-rec/60 bg-rec/10 text-rec"
                  : "border-line bg-panel2 text-dim hover:border-line2 hover:text-fg"
              }`}
            >
              <IcHeadOff className="h-3.5 w-3.5" />
              {ptt.deafened ? "ВКЛ ЗВУК" : "ГЛУШИТЬ"}
            </button>
            <span className="hidden shrink-0 font-mono text-[9px] leading-tight text-faint xl:block">
              Opus 128 кбит/с
              <br />
              эхо-подавление
            </span>
          </div>

          {config.mumble.webUrl && (
            <p className="mt-1.5 text-center font-mono text-[8.5px] leading-relaxed text-faint">
              реальный звук — кнопка «АУДИОКОНСОЛЬ» (mumble-web); здесь — пульт-эмуляция
            </p>
          )}
        </div>
      </div>

      {consoleOpen && (
        <AudioConsole
          baseUrl={config.mumble.webUrl}
          username={me?.name ?? "Наблюдатель"}
          channel={room.mumbleChannel}
          roomLabel={`${room.code} · ${room.name}`}
          onClose={() => setConsoleOpen(false)}
        />
      )}
    </Panel>
  );
}
