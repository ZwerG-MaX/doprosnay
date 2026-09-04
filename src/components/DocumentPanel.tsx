import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { OBSERVERS, PHRASES, type EventType, type Observer } from "../lib/data";
import { fmtClock, randInt } from "../lib/hooks";
import {
  loadDocsApi,
  buildEditorConfig,
  makeDocKey,
  downloadDocument,
  type DocsEditorInstance,
} from "../lib/onlyoffice";
import { Panel } from "./Panel";
import { ConnectModal, loadSettings, saveSettings, type OOSettings } from "./ConnectModal";
import { IcSignal, IcSave, IcFile } from "./Icons";

const SEED_DOC = `ПРОТОКОЛ СОВМЕСТНОГО НАБЛЮДЕНИЯ
Допросная № 2 · дело № 2026/0417
Документ открыт для совместного редактирования через ONLYOFFICE Docs.

── ЗАПИСИ СОАВТОРОВ ───────────────────────────────

[Н-2 · 14:02:47] Фигурант спокоен, отвечает односложно.
[Н-4 · 14:05:12] Отмечаю: избегает зрительного контакта со следователем.`;

const DOC_LS_KEY = "doprosnaya2-oo-document-v1";

type ConnMode = "offline" | "connecting" | "online";

interface RemoteEdit {
  id: number;
  tag: string;
  name: string;
  color: string;
  text: string;
}

interface Props {
  observers: Observer[];
  onEvent: (t: EventType, s: string) => void;
  onToast: (s: string) => void;
}

let editId = 1;

export function DocumentPanel({ observers, onEvent, onToast }: Props) {
  const settings = loadSettings();
  const [mode, setMode] = useState<ConnMode>("offline");
  const [connError, setConnError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [docTitle, setDocTitle] = useState(settings.title);

  /* ---- содержимое документа (офлайн-режим) ---- */
  const [text, setText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DOC_LS_KEY);
      if (saved !== null && saved.length > 0) return saved;
    } catch {
      /* ignore */
    }
    return SEED_DOC;
  });
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [savedAt, setSavedAt] = useState<string>(() => fmtClock(new Date()));
  const [typingObs, setTypingObs] = useState<number | null>(null);
  const [ribbon, setRibbon] = useState<RemoteEdit | null>(null);
  const [ribbonFade, setRibbonFade] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<DocsEditorInstance | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const saveTimer = useRef(0);
  const typingTimer = useRef(0);
  const ribbonTimer = useRef(0);
  const observersRef = useRef(observers);
  observersRef.current = observers;

  /* ---- автосохранение ---- */
  const persist = (val: string) => {
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(DOC_LS_KEY, val);
      } catch {
        /* ignore */
      }
      setSaveState("saved");
      setSavedAt(fmtClock(new Date()));
    }, 700);
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    persist(e.target.value);
  };

  /* ---- автоподключение при наличии сохранённого сервера ---- */
  const bootRef = useRef(false);
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    if (settings.server.trim()) {
      void connectToServer(settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectToServer = async (s: OOSettings) => {
    setMode("connecting");
    setConnError(null);
    onEvent("sys", `ONLYOFFICE: подключение к ${s.server} …`);
    try {
      await loadDocsApi(s.server.trim());
      setMode("online");
      setDocTitle(s.title || "Документ.docx");
      onEvent("doc", `ONLYOFFICE Docs: редактор подключён (${s.server})`);
      onToast("Редактор ONLYOFFICE подключён");
    } catch (e) {
      setMode("offline");
      const msg = e instanceof Error ? e.message : "Сервер недоступен";
      setConnError(msg);
      onEvent("sys", `ONLYOFFICE: нет связи с сервером — офлайн-режим`);
    }
  };

  const goOffline = () => {
    setMode("offline");
    setConnError(null);
    setShowModal(false);
    onEvent("sys", "ONLYOFFICE: офлайн-режим совместного редактирования");
  };

  /* ---- монтирование реального редактора DocsAPI ---- */
  useEffect(() => {
    if (mode !== "online" || !window.DocsAPI || !placeholderRef.current) return;
    const s = loadSettings();
    const cfg = buildEditorConfig({
      title: s.title || "Документ.docx",
      docKey: makeDocKey(s.title || "document"),
      docUrl: s.docUrl || "",
      user: { id: "observer-1", name: OBSERVERS[0].name },
      callbackUrl: s.server ? `${s.server.replace(/\/+$/, "")}/callback` : undefined,
      token: s.jwt || undefined,
      events: {
        onAppReady: () => onEvent("doc", "ONLYOFFICE: редактор готов к работе"),
        onDocumentStateChange: (e) => {
          if (e.data) setSaveState("saving");
          else {
            setSaveState("saved");
            setSavedAt(fmtClock(new Date()));
          }
        },
        onError: (e) => {
          setConnError(e.data?.errorDescription || "Ошибка редактора");
          onEvent("sys", `ONLYOFFICE: ошибка редактора (код ${e.data?.errorCode ?? "?"})`);
        },
      },
    });
    try {
      editorRef.current = new window.DocsAPI.DocEditor("oo-placeholder", cfg);
    } catch (e) {
      setMode("offline");
      setConnError(e instanceof Error ? e.message : "Не удалось инициализировать редактор");
    }
    return () => {
      try {
        editorRef.current?.destroyEditor();
      } catch {
        /* ignore */
      }
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ---- симуляция совместного редактирования (офлайн) ---- */
  const appendRemote = (line: string) => {
    const ta = taRef.current;
    const next = textRef.current + line;
    const sel =
      ta && document.activeElement === ta
        ? { s: ta.selectionStart ?? next.length, e: ta.selectionEnd ?? next.length }
        : null;
    setText(next);
    persist(next);
    if (ta && sel) {
      requestAnimationFrame(() =>
        ta.setSelectionRange(Math.min(sel.s, next.length), Math.min(sel.e, next.length)),
      );
    }
  };

  useEffect(() => {
    if (mode !== "offline") return;
    let alive = true;
    let outer = 0;
    let inner = 0;
    const tick = () => {
      outer = window.setTimeout(() => {
        if (!alive) return;
        const candidates = observersRef.current.filter((o) => o.n !== 1 && !o.muted);
        if (candidates.length === 0) {
          tick();
          return;
        }
        const obs = candidates[randInt(0, candidates.length - 1)];
        const phrase = PHRASES[randInt(0, PHRASES.length - 1)];
        setTypingObs(obs.n);
        inner = window.setTimeout(() => {
          if (!alive) return;
          setTypingObs(null);
          appendRemote(`\n[${obs.tag} · ${fmtClock(new Date())}] ${phrase}`);
          setRibbon({ id: editId++, tag: obs.tag, name: obs.name, color: obs.color, text: phrase });
          setRibbonFade(false);
          window.clearTimeout(ribbonTimer.current);
          ribbonTimer.current = window.setTimeout(() => setRibbonFade(true), 2600);
          onEvent("doc", `${obs.tag} (${obs.name}): правка в документе`);
          tick();
        }, randInt(1400, 2400));
      }, randInt(8000, 14000));
    };
    tick();
    return () => {
      alive = false;
      window.clearTimeout(outer);
      window.clearTimeout(inner);
      window.clearTimeout(ribbonTimer.current);
      window.clearTimeout(typingTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const coAuthors = observers.filter((o) => o.n !== 1).length;

  const modePill =
    mode === "online"
      ? "border-live/40 bg-live/10 text-live"
      : mode === "connecting"
        ? "border-amber/40 bg-amber/10 text-amber"
        : "border-line2 bg-panel2 text-dim";

  return (
    <Panel
      title="ONLYOFFICE DOCS"
      sub={mode === "online" ? "совместное редактирование · сервер" : "совместное редактирование"}
      className="min-h-[420px] flex-1 lg:min-h-0 lg:flex-[3]"
      delay={120}
      right={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowModal(true)}
            title="Настройка подключения к Document Server"
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[9.5px] tracking-wider transition-all active:scale-95 ${modePill}`}
          >
            <IcSignal
              className={`h-3 w-3 ${mode === "connecting" ? "blink-rec" : ""}`}
            />
            {mode === "online"
              ? "СЕРВЕР"
              : mode === "connecting"
                ? "ПОДКЛЮЧЕНИЕ…"
                : "ОФЛАЙН"}
          </button>
        </div>
      }
    >
      {/* строка документа: название + соавторы + сохранение */}
      <div className="flex items-center gap-2.5 border-b border-line px-3 py-2">
        <IcFile className="h-4 w-4 shrink-0 text-hud" />
        <input
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          spellCheck={false}
          className="min-w-0 flex-1 truncate rounded-sm border border-transparent bg-transparent font-body text-[12.5px] font-medium text-fg focus:border-line2 focus:bg-ink/40 focus:outline-none"
          title="Название документа"
        />

        {/* аватары соавторов */}
        <div className="flex shrink-0 items-center -space-x-1.5">
          {observers.map((o) => (
            <span
              key={o.n}
              title={`${o.name} · ${o.role}${typingObs === o.n ? " · печатает…" : ""}`}
              className={`relative grid h-6 w-6 place-items-center rounded-full border-2 border-panel font-mono text-[9px] font-bold text-ink transition-transform hover:z-10 hover:scale-110 ${
                typingObs === o.n ? "typing-ring" : ""
              }`}
              style={{ background: o.color }}
            >
              {o.n}
              {typingObs === o.n && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-sm bg-amber px-1 font-mono text-[7px] leading-tight text-ink">
                  …
                </span>
              )}
            </span>
          ))}
        </div>
        <span className="hidden shrink-0 font-mono text-[9.5px] text-faint sm:block">
          {coAuthors} соавт.
        </span>

        <button
          onClick={() => {
            const name = downloadDocument(docTitle, text);
            onToast(`Документ сохранён: ${name}`);
            onEvent("doc", `Документ выгружен: ${name}`);
          }}
          title="Скачать документ"
          className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line bg-panel2 px-2.5 font-mono text-[9.5px] tracking-widest text-dim transition-all hover:border-hud/60 hover:text-hud active:scale-95"
        >
          <IcSave className="h-3.5 w-3.5" />
          <span className="hidden md:inline">СКАЧАТЬ</span>
        </button>
      </div>

      {/* лента последней правки соавтора */}
      {mode === "offline" && ribbon && (
        <div
          className={`mx-3 mt-2 flex items-start gap-2 rounded-md border border-line bg-panel2/70 px-2.5 py-1.5 transition-opacity duration-700 ${
            ribbonFade ? "opacity-35" : "opacity-100"
          }`}
        >
          <span
            className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
            style={{ background: ribbon.color }}
          />
          <p className="min-w-0 font-mono text-[10px] leading-snug text-dim">
            <span className="font-semibold" style={{ color: ribbon.color }}>
              {ribbon.tag} {ribbon.name}
            </span>{" "}
            добавил(а): {ribbon.text}
          </p>
        </div>
      )}

      {/* область редактирования */}
      <div className="min-h-0 flex-1 p-3">
        {mode === "online" ? (
          <div ref={placeholderRef} id="oo-placeholder" className="h-full w-full overflow-hidden rounded-md" />
        ) : (
          <textarea
            ref={taRef}
            value={text}
            onChange={onChange}
            spellCheck={false}
            placeholder="Начните вводить текст документа…"
            className="paper h-full min-h-[180px] w-full resize-none rounded-md border border-line2 px-3 pl-[54px] font-body text-[12.5px] leading-[30px] shadow-[inset_0_2px_10px_rgba(10,20,35,0.08)] transition-shadow focus:outline-none focus:ring-1 focus:ring-hud/60"
          />
        )}
      </div>

      {/* строка состояния */}
      <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-line px-3 font-mono text-[10px] text-faint">
        <span className="tabular-nums">{text.length} симв.</span>
        <span className="tabular-nums">{words} слов</span>
        {connError && mode === "offline" && (
          <span className="hidden truncate text-rec/80 lg:inline" title={connError}>
            {connError}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1.5">
          {saveState === "saving" ? (
            <span className="text-amber">сохранение…</span>
          ) : (
            <span>
              сохранено <span className="text-dim tabular-nums">{savedAt}</span>
            </span>
          )}
        </span>
      </footer>

      {showModal && (
        <ConnectModal
          initial={loadSettings()}
          onClose={() => setShowModal(false)}
          onConnect={(s) => {
            saveSettings(s);
            setShowModal(false);
            void connectToServer(s);
          }}
          onOffline={goOffline}
        />
      )}
    </Panel>
  );
}
