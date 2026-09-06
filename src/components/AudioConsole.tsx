import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IcRadio, IcClose, IcSignal, IcExpand, IcMic } from "./Icons";

interface Props {
  baseUrl: string;        // адрес аудиоконсоли mumble-web (панель «Серверы → Mumble»)
  username: string;       // ник наблюдателя (латиница — ограничение Murmur)
  channel: string;        // канал комнаты, напр. «Допросная №2»
  roomLabel: string;      // «Д-01 · Допросная №2»
  onClose: () => void;
}

/* Транслитерация: Murmur принимает только ASCII-ники по умолчанию. */
function mumbleSafeName(raw: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
    и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
    с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
    щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  const out = raw
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return out || "observer";
}

export function AudioConsole({ baseUrl, username, channel, roomLabel, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  const safeUser = mumbleSafeName(username);
  const url = `${baseUrl.replace(/\/$/, "")}/?username=${encodeURIComponent(safeUser)}&channel=${encodeURIComponent(channel)}&autoconnect=true&joindialog=false`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-2 md:p-4">
      <div className="rise relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-line2 bg-panel shadow-[0_30px_100px_rgba(0,0,0,0.7)]">
        {/* шапка консоли */}
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-panel2/70 px-4">
          <IcRadio className="h-4.5 w-4.5 text-amber" />
          <h2 className="font-display text-[12px] tracking-[0.18em] text-fg">АУДИОКОНСОЛЬ · MUMBLE</h2>
          <span className="hidden font-mono text-[9.5px] text-faint sm:block">{roomLabel}</span>

          <span
            className={`ml-auto flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] tracking-wider ${
              loaded
                ? "border-live/60 bg-live/10 text-live"
                : "border-amber/60 bg-amber/10 text-amber blink-rec"
            }`}
          >
            <IcSignal className="h-3 w-3" />
            {loaded ? "В ЭФИРЕ" : "СОЕДИНЕНИЕ…"}
          </span>
          <button
            onClick={() => window.open(url, "_blank", "noopener")}
            title="Открыть аудиоконсоль в отдельной вкладке"
            className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-dim transition-all hover:border-hud/60 hover:text-hud active:scale-95"
          >
            <IcExpand className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Закрыть (ESC) — клиент продолжает работать во вкладке"
            className="grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-dim transition-all hover:border-rec/60 hover:text-rec active:scale-95"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </header>
        <div className="rt-stripe" />

        {/* окно реального клиента mumble-web */}
        <div className="relative min-h-0 flex-1 bg-black">
          {!loaded && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-panel">
              <span className="eq text-amber">
                <i /><i /><i /><i />
              </span>
              <span className="font-mono text-[11px] tracking-[0.2em] text-dim">
                ПОДКЛЮЧЕНИЕ К {baseUrl.replace(/^https?:\/\//, "").toUpperCase()}…
              </span>
              <span className="max-w-[420px] text-center font-mono text-[9.5px] leading-relaxed text-faint">
                Если консоль не открылась — проверьте адрес в «Серверы → Mumble → Веб-клиент»
                и доступность домена mumble.local (см. README).
              </span>
            </div>
          )}
          <iframe
            src={url}
            title="Аудиоконсоль Mumble"
            allow="microphone; autoplay; clipboard-write"
            onLoad={() => setLoaded(true)}
            className="absolute inset-0 h-full w-full border-0 bg-white"
          />
        </div>

        {/* нижняя панель */}
        <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-panel2/50 px-4 py-2.5">
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] text-faint">
            <IcMic className="h-3.5 w-3.5 text-amber" />
            ник в эфире: <b className="text-dim">{safeUser}</b> · канал: <b className="text-dim">{channel}</b>
          </span>
          <span className="font-mono text-[9.5px] text-faint">
            тангента: Settings → Audio → Push-to-talk (или режим Voice activity)
          </span>
          <span className="ml-auto truncate font-mono text-[9.5px] text-faint">{url}</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
