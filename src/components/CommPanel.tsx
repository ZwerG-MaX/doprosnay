import { useEffect, useRef, useState } from "react";
import { OBSERVERS, MUMBLE_URL, type EventType } from "../lib/data";
import { useInterval, randInt } from "../lib/hooks";
import { Panel } from "./Panel";
import { IcMic, IcMicOff, IcHeadOff, IcRadio, IcChevR } from "./Icons";

function beep(freq: number) {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.045, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.1);
    window.setTimeout(() => ctx.close().catch(() => undefined), 250);
  } catch {
    /* аудио недоступно — тихо игнорируем */
  }
}

function Eq({ className = "text-amber" }: { className?: string }) {
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
  onEvent: (t: EventType, s: string) => void;
}

export function CommPanel({ onEvent }: Props) {
  const [status, setStatus] = useState<"connecting" | "online">("connecting");
  const [latency, setLatency] = useState(24);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [tx, setTx] = useState(false);
  const [txSec, setTxSec] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: 14 }, () => 6));
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const txRef = useRef(false);
  const txSecRef = useRef(0);
  const speakTimer = useRef<number>(0);

  /* подключение к серверу Mumble */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setStatus("online");
      onEvent("audio", `Mumble: подключено к ${MUMBLE_URL} · Opus 128 кбит/с`);
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useInterval(() => {
    if (status === "online") setLatency(randInt(17, 42));
  }, 2400);

  /* тангента */
  const startTx = () => {
    if (txRef.current || status !== "online") return;
    if (muted || deafened) {
      onEvent("audio", "Передача отклонена: микрофон выключен");
      return;
    }
    txRef.current = true;
    txSecRef.current = 0;
    setTx(true);
    setTxSec(0);
    beep(988);
    onEvent("audio", "Тангента: начата передача в «Допросную №2»");
  };

  const stopTx = () => {
    if (!txRef.current) return;
    txRef.current = false;
    setTx(false);
    beep(622);
    onEvent("audio", `Тангента: передача завершена (${txSecRef.current} с)`);
  };

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable))
        return;
      e.preventDefault();
      startTx();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") stopTx();
    };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", dn);
      window.removeEventListener("keyup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, muted, deafened]);

  /* таймер и индикатор уровня */
  useInterval(() => {
    if (txRef.current) {
      txSecRef.current += 1;
      setTxSec(txSecRef.current);
    }
  }, 1000);

  useInterval(() => {
    setBars((prev) =>
      prev.map(() => (txRef.current ? randInt(14, 100) : randInt(4, 9)))
    );
  }, 120);

  /* симуляция голосовой активности в канале */
  useInterval(() => {
    if (status !== "online" || Math.random() < 0.45) return;
    const pool = [101, 102, ...OBSERVERS.filter((o) => !o.muted && o.n !== 1).map((o) => o.n)];
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
  ) => {
    const isSpeaking = speakingId === speakKey;
    return (
      <div
        key={keyVal}
        className={`flex h-[22px] items-center gap-1.5 rounded-sm px-1.5 transition-colors ${
          isSpeaking ? "bg-raise text-fg" : "text-dim hover:bg-panel2/70"
        }`}
      >
        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: dot }} />
        <span className="font-mono text-[10px] font-semibold tracking-wide">{label}</span>
        <span className={`truncate text-[11px] ${isSpeaking ? "text-fg" : "text-dim"}`}>
          {name}
        </span>
        <span className="ml-auto flex items-center">
          {isMuted ? (
            <IcMicOff className="h-3 w-3 text-rec/80" />
          ) : isSpeaking ? (
            <Eq className="text-live" />
          ) : (
            <IcMic className="h-3 w-3 text-faint" />
          )}
        </span>
      </div>
    );
  };

  return (
    <Panel
      title="АУДИОКАНАЛ · MUMBLE"
      sub={MUMBLE_URL}
      delay={90}
      className="shrink-0 lg:max-h-[440px]"
      ledClass={
        status === "online"
          ? "bg-live shadow-[0_0_8px_rgba(53,217,127,0.8)]"
          : "bg-amber shadow-[0_0_8px_rgba(255,180,58,0.8)] blink-rec"
      }
      right={
        <span className="rounded-sm border border-line bg-raise px-2 py-0.5 font-mono text-[10px] text-dim tabular-nums">
          {status === "online" ? `${latency} мс` : "подключение…"}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5">
        {/* канал допросной */}
        <div>
          <div className={channelHead}>
            <IcChevR className="h-3 w-3" />
            ДОПРОСНАЯ №2 · ГРОМКАЯ СВЯЗЬ
          </div>
          <div className="mt-1 border-l-2 border-amber/50 pl-1">
            {userRow("s", "#ffb43a", "SLD", "следователь · майор Ребров", 101)}
            {userRow("o", "#ffb43a", "OPR", "оперативник · ст. л-т Ткачук", 102)}
          </div>
        </div>

        {/* наблюдатели */}
        <div>
          <div className={channelHead}>
            <IcChevR className="h-3 w-3" />
            НАБЛЮДАТЕЛИ · 8 В КАНАЛЕ
          </div>
          <div className="mt-1 grid grid-cols-1 border-l-2 border-hud/40 pl-1 sm:grid-cols-2 sm:gap-x-2">
            {OBSERVERS.map((o) =>
              userRow(
                String(o.n),
                o.color,
                o.tag,
                o.n === 1 ? `${o.name} (вы)` : o.name,
                o.n,
                o.muted,
              ),
            )}
          </div>
        </div>

        {/* тангента */}
        <div className="mt-auto pt-1">
          <button
            onPointerDown={startTx}
            onPointerUp={stopTx}
            onPointerLeave={stopTx}
            onPointerCancel={stopTx}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex h-[72px] w-full touch-none select-none flex-col items-center justify-center gap-0.5 rounded-sm border font-display tracking-[0.22em] transition-all duration-150 ${
              tx
                ? "ptt-live border-amber bg-amber/15 text-amber"
                : "border-line2 bg-panel2 text-amber/90 hover:border-amber/60 hover:bg-amber/5 active:scale-[0.99]"
            }`}
          >
            <span className="flex items-center gap-2.5 text-[13px]">
              {tx ? <Eq className="text-amber" /> : <IcRadio className="h-4.5 w-4.5" />}
              {tx ? "ПЕРЕДАЧА" : "PUSH-TO-TALK"}
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-dim">
              {tx
                ? `в эфире ${txSec} с → «Допросная №2»`
                : "удерживайте кнопку или SPACE"}
            </span>
          </button>

          {/* индикатор уровня */}
          <div className="mt-2 flex h-7 items-end gap-[3px] rounded-sm border border-line bg-panel2 px-2 py-1">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`flex-1 rounded-[1px] transition-all duration-100 ${
                  tx ? (h > 72 ? "bg-rec" : h > 40 ? "bg-amber" : "bg-live") : "bg-line2/70"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
            <span className="ml-1.5 w-[74px] shrink-0 text-right font-mono text-[9px] leading-none text-faint">
              {tx ? "TX · -6 дБ" : "RX · тишина"}
            </span>
          </div>

          {/* управление микрофоном */}
          <div className="mt-2 flex items-center gap-1.5">
            <button
              onClick={() => {
                setMuted((m) => !m);
                onEvent("audio", muted ? "Микрофон включён" : "Микрофон выключен (mute)");
              }}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm border font-mono text-[10px] tracking-widest transition-all active:scale-[0.98] ${
                muted
                  ? "border-rec/60 bg-rec/10 text-rec"
                  : "border-line bg-panel2 text-dim hover:border-line2 hover:text-fg"
              }`}
            >
              {muted ? <IcMicOff className="h-3.5 w-3.5" /> : <IcMic className="h-3.5 w-3.5" />}
              {muted ? "ВКЛ МИК" : "МИК ВКЛ"}
            </button>
            <button
              onClick={() => {
                setDeafened((d) => !d);
                onEvent("audio", deafened ? "Прослушивание включено" : "Прослушивание отключено (deafen)");
              }}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-sm border font-mono text-[10px] tracking-widest transition-all active:scale-[0.98] ${
                deafened
                  ? "border-rec/60 bg-rec/10 text-rec"
                  : "border-line bg-panel2 text-dim hover:border-line2 hover:text-fg"
              }`}
            >
              <IcHeadOff className="h-3.5 w-3.5" />
              {deafened ? "ВКЛ ЗВУК" : "ГЛУШИТЬ"}
            </button>
            <span className="hidden shrink-0 font-mono text-[9px] leading-tight text-faint xl:block">
              Opus 128 кбит/с
              <br />
              эхо-подавление
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
