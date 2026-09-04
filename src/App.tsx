import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "./components/StatusBar";
import { CameraWall } from "./components/CameraWall";
import { CommPanel } from "./components/CommPanel";
import { DocumentPanel } from "./components/DocumentPanel";
import { CollaborationFeed } from "./components/CollaborationFeed";
import { Ticker } from "./components/Ticker";
import { LoginScreen } from "./components/LoginScreen";
import { ServerSettingsModal } from "./components/ServerSettingsModal";
import { AccessManager } from "./components/AccessManager";
import { LogViewer } from "./components/LogViewer";
import { IcShield } from "./components/Icons";
import { StoreProvider, mumbleUrlOf, useStore } from "./lib/store";
import {
  type EventItem,
  type EventType,
  type Observer,
  type UserRec,
} from "./lib/data";
import { fmtClock, useInterval } from "./lib/hooks";
import { usePtt } from "./lib/usePtt";

let nextId = 1;

function Shell() {
  const { config, users, me, room, myRooms, logout, setRoomId } = useStore();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const [mumbleOnline, setMumbleOnline] = useState(false);
  const [connected, setConnected] = useState<Observer[]>([]);
  const [serversOpen, setServersOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const sessionStart = useRef(Date.now());
  const scheduled = useRef<Set<string>>(new Set());
  const connectedRef = useRef<Observer[]>(connected);
  connectedRef.current = connected;

  const addEvent = useCallback((type: EventType, text: string) => {
    setEvents((prev) =>
      [{ id: nextId++, time: fmtClock(new Date()), type, text }, ...prev].slice(0, 60),
    );
  }, []);

  const pushToast = useCallback((text: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, text }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);

  /* пользователь → участник канала */
  const toObs = useCallback(
    (u: UserRec): Observer => {
      const n = users.indexOf(u) + 1;
      return { n, tag: `Н-${n}`, name: u.name, role: u.title, color: u.color, muted: !!u.muted };
    },
    [users],
  );

  /* подключение к серверу Mumble (учитывает флаг enabled из настроек админа) */
  const mumbleEnabled = config.mumble.enabled;
  useEffect(() => {
    if (!mumbleEnabled) {
      setMumbleOnline(false);
      return;
    }
    const t = window.setTimeout(() => {
      setMumbleOnline(true);
      addEvent("audio", `Mumble: подключено к ${mumbleUrlOf(config)} · Opus 128 кбит/с`);
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mumbleEnabled]);

  const mumbleLive = mumbleOnline && mumbleEnabled;
  const ptt = usePtt(mumbleLive, addEvent);

  /* при входе / смене комнаты — пересобираем канал наблюдателей */
  useEffect(() => {
    if (!me) return;
    scheduled.current = new Set([me.id]);
    setConnected([toObs(me)]);
    addEvent("audio", `Вы вошли в канал «${room.mumbleChannel}» (${room.name})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id, room.id]);

  /* участники подключаются постепенно — только из состава активной комнаты */
  const candidatesLeft = me
    ? users.filter((u) => u.id !== me.id && (u.isAdmin || u.view.includes(room.id)))
    : [];
  const allIn = candidatesLeft.every((u) => scheduled.current.has(u.id));

  useInterval(
    () => {
      const next = candidatesLeft.find((u) => !scheduled.current.has(u.id));
      if (!next) return;
      scheduled.current.add(next.id);
      const obs = toObs(next);
      setConnected((prev) => (prev.some((p) => p.n === obs.n) ? prev : [...prev, obs]));
      addEvent("audio", `${obs.tag} (${obs.name}) подключился к каналу «${room.mumbleChannel}»`);
    },
    allIn || !me ? null : 3200,
  );

  const joinNext = useCallback(() => {
    const next = candidatesLeft.find((u) => !scheduled.current.has(u.id));
    if (!next) return;
    scheduled.current.add(next.id);
    const obs = toObs(next);
    setConnected((prev) => (prev.some((p) => p.n === obs.n) ? prev : [...prev, obs]));
    addEvent("audio", `${obs.tag} (${obs.name}) подключён вручную`);
  }, [candidatesLeft, toObs, addEvent]);

  const leaveObs = useCallback(
    (o: Observer) => {
      setConnected((prev) => prev.filter((p) => p.n !== o.n));
      const u = users.find((x) => x.name === o.name);
      if (u) scheduled.current.add(u.id);
      addEvent("audio", `${o.tag} (${o.name}) покинул канал`);
    },
    [users, addEvent],
  );

  /* стартовая последовательность */
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current || !me) return;
    booted.current = true;
    const seq: Array<[number, EventType, string]> = [
      [250, "sys", `Пульт: вход в систему — ${me.name} (${me.isAdmin ? "администратор" : "оператор"})`],
      [800, "video", `MACROSCOP: соединение с ${config.macroscop.host} установлено`],
      [1300, "video", "Потоки камер активны · 25 к/с · H.265"],
      [1800, "sys", "Сервер аудиоканала: рукопожатие Mumble (UDP)"],
      [2300, "doc", "ONLYOFFICE Docs: конфигурация загружена"],
    ];
    seq.forEach(([d, t, s]) => window.setTimeout(() => addEvent(t, s), d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  /* ── экран входа ── */
  if (!me) {
    return <LoginScreen />;
  }

  /* ── нет прав ни на одну комнату ── */
  if (myRooms.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rise max-w-md rounded-xl border border-line bg-panel/80 p-8 text-center">
          <IcShield className="mx-auto h-10 w-10 text-faint" />
          <h1 className="mt-4 font-display text-[15px] tracking-[0.14em] text-fg">ДОСТУП НЕ НАЗНАЧЕН</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-dim">
            Администратор ещё не распределил вас по комнатам. Обратитесь к старшему смены.
          </p>
          <button
            onClick={logout}
            className="mt-5 h-10 rounded-lg border border-line bg-panel2 px-5 font-mono text-[11px] tracking-widest text-dim transition-all hover:border-line2 hover:text-fg active:scale-95"
          >
            СМЕНИТЬ УЧЁТНУЮ ЗАПИСЬ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col text-fg lg:h-screen lg:overflow-hidden">
      <StatusBar
        sessionStart={sessionStart.current}
        onOpenServers={() => setServersOpen(true)}
        onOpenAccess={() => setAccessOpen(true)}
        onOpenLogs={() => setLogsOpen(true)}
        onLogout={logout}
      />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-2">
        {/* левая половина: документ ONLYOFFICE + активность */}
        <section className="flex min-h-0 flex-col gap-3">
          <DocumentPanel observers={connected.filter((o) => o.name !== me.name)} onEvent={addEvent} onToast={pushToast} />
          <CollaborationFeed events={events} />
        </section>

        {/* правая половина: видеостена + аудиоканал */}
        <section className="flex min-h-0 flex-col gap-3">
          <CameraWall onEvent={addEvent} onToast={pushToast} ptt={ptt} />
          <CommPanel
            connected={connected}
            online={mumbleLive}
            ptt={ptt}
            onJoin={joinNext}
            onLeave={leaveObs}
            onEvent={addEvent}
          />
        </section>
      </main>

      <Ticker />

      {/* админ-модалки */}
      {serversOpen && (
        <ServerSettingsModal
          onClose={() => setServersOpen(false)}
          onToast={pushToast}
          onEvent={(t, s) => addEvent(t, s)}
        />
      )}
      {accessOpen && <AccessManager onClose={() => setAccessOpen(false)} onToast={pushToast} />}
      {logsOpen && <LogViewer onClose={() => setLogsOpen(false)} onToast={pushToast} />}

      {/* уведомления */}
      <div className="pointer-events-none fixed bottom-12 right-4 z-[110] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rise flex items-center gap-2.5 rounded-md border border-line2 bg-panel2/95 px-3.5 py-2.5 shadow-2xl backdrop-blur"
          >
            <span className="led bg-live shadow-[0_0_7px_rgba(49,217,138,0.9)]" />
            <span className="font-mono text-[11.5px] text-fg">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
