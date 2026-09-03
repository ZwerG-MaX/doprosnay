import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "./components/StatusBar";
import { CameraWall } from "./components/CameraWall";
import { CommPanel } from "./components/CommPanel";
import { ProtocolEditor } from "./components/ProtocolEditor";
import { EventLog } from "./components/EventLog";
import { Ticker } from "./components/Ticker";
import { OBSERVERS, type EventItem, type EventType } from "./lib/data";
import { fmtClock } from "./lib/hooks";

let nextId = 1;

export default function App() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const sessionStart = useRef(Date.now());

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

  /* стартовая последовательность подключения систем */
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const seq: Array<[number, EventType, string]> = [
      [250, "sys", "Пульт наблюдения: инициализация · смена Б, пост 7"],
      [800, "video", "MACROSCOP: соединение с VMS-2 установлено (ГОСТ TLS)"],
      [1300, "video", "Потоки CAM 01 / CAM 02 / CAM 03 активны · 25 к/с · H.265"],
      [1800, "sys", "Сервер аудиоканала: рукопожатие Mumble (UDP 64738)"],
    ];
    seq.forEach(([d, t, s]) => window.setTimeout(() => addEvent(t, s), d));
    OBSERVERS.forEach((o, i) =>
      window.setTimeout(
        () => addEvent("audio", `${o.tag} (${o.name}) подключился к каналу «Наблюдатели»`),
        2300 + i * 430,
      ),
    );
  }, [addEvent]);

  return (
    <div className="flex min-h-screen flex-col text-fg lg:h-screen lg:overflow-hidden">
      <StatusBar sessionStart={sessionStart.current} />

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-2">
        {/* левая половина: совместный протокол + журнал событий */}
        <section className="flex min-h-0 flex-col gap-3">
          <ProtocolEditor onEvent={addEvent} />
          <EventLog events={events} />
        </section>

        {/* правая половина: видеостена + аудиоканал */}
        <section className="flex min-h-0 flex-col gap-3">
          <CameraWall onEvent={addEvent} onToast={pushToast} />
          <CommPanel onEvent={addEvent} />
        </section>
      </main>

      <Ticker />

      {/* уведомления */}
      <div className="pointer-events-none fixed bottom-12 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rise flex items-center gap-2.5 rounded-sm border border-line2 bg-panel2/95 px-3.5 py-2.5 shadow-2xl backdrop-blur"
          >
            <span className="led bg-live shadow-[0_0_7px_rgba(53,217,127,0.9)]" />
            <span className="font-mono text-[11.5px] text-fg">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
