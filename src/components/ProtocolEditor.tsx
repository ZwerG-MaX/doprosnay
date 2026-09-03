import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  OBSERVERS,
  PHRASES,
  SEED_PROTOCOL,
  PROTOCOL_LS_KEY,
  type EventType,
} from "../lib/data";
import { fmtClock, randInt } from "../lib/hooks";
import { Panel } from "./Panel";
import { IcClock, IcPlus, IcFile, IcTrash, IcSave, IcMicOff, IcWave } from "./Icons";

interface Props {
  onEvent: (t: EventType, s: string) => void;
}

export function ProtocolEditor({ onEvent }: Props) {
  const [text, setText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PROTOCOL_LS_KEY);
      if (saved !== null && saved.length > 0) return saved;
    } catch {
      /* localStorage недоступен */
    }
    return SEED_PROTOCOL;
  });
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [savedAt, setSavedAt] = useState<string>(() => fmtClock(new Date()));
  const [typingObs, setTypingObs] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const saveTimer = useRef<number>(0);
  const clearTimer = useRef<number>(0);

  const persist = (val: string) => {
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(PROTOCOL_LS_KEY, val);
      } catch {
        /* ignore */
      }
      setSaveState("saved");
      setSavedAt(fmtClock(new Date()));
    }, 800);
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    persist(e.target.value);
  };

  /* дописывание в конец с сохранением курсора пользователя */
  const appendLine = (line: string) => {
    const ta = taRef.current;
    const next = textRef.current + line;
    const sel =
      ta && document.activeElement === ta
        ? { s: ta.selectionStart ?? next.length, e: ta.selectionEnd ?? next.length }
        : null;
    setText(next);
    persist(next);
    if (ta && sel) {
      requestAnimationFrame(() => {
        ta.setSelectionRange(Math.min(sel.s, next.length), Math.min(sel.e, next.length));
      });
    }
  };

  /* симуляция совместной работы: коллеги дописывают наблюдения */
  useEffect(() => {
    let alive = true;
    let outer = 0;
    let inner = 0;
    const tick = () => {
      outer = window.setTimeout(() => {
        if (!alive) return;
        const candidates = OBSERVERS.filter((o) => o.n !== 1 && !o.muted);
        const obs = candidates[randInt(0, candidates.length - 1)];
        const phrase = PHRASES[randInt(0, PHRASES.length - 1)];
        setTypingObs(obs.n);
        inner = window.setTimeout(() => {
          if (!alive) return;
          setTypingObs(null);
          appendLine(`\n[${obs.tag} · ${fmtClock(new Date())}] ${phrase}`);
          onEvent("doc", `${obs.tag} (${obs.name}): запись добавлена в протокол`);
          tick();
        }, randInt(1500, 2600));
      }, randInt(9000, 15000));
    };
    tick();
    return () => {
      alive = false;
      window.clearTimeout(outer);
      window.clearTimeout(inner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const insertAtCursor = (snippet: string) => {
    const ta = taRef.current;
    if (!ta) return;
    const s = ta.selectionStart ?? textRef.current.length;
    const e = ta.selectionEnd ?? s;
    const next = textRef.current.slice(0, s) + snippet + textRef.current.slice(e);
    setText(next);
    persist(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(s + snippet.length, s + snippet.length);
    });
  };

  const stampRow = (body: string) => `\n[Н-1 · ${fmtClock(new Date())}] ${body}`;

  const toolBtn =
    "flex h-7 items-center gap-1.5 rounded-sm border border-line bg-panel2 px-2.5 font-mono text-[10px] tracking-wider text-dim transition-all hover:border-line2 hover:text-fg active:scale-95";

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const entries = (text.match(/^\[Н-/gm) || []).length;

  return (
    <Panel
      title="ПРОТОКОЛ НАБЛЮДЕНИЯ"
      sub="совместный редактор · 8 участников"
      className="min-h-[420px] flex-1 lg:min-h-0 lg:flex-[3]"
      delay={120}
      right={
        <span className="flex items-center gap-1.5 rounded-sm border border-line bg-raise px-2 py-0.5 font-mono text-[10px] text-dim">
          <IcWave className="h-3 w-3 text-live" />
          автосинхронизация
        </span>
      }
    >
      {/* присутствие наблюдателей */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
        {OBSERVERS.map((o) => (
          <span
            key={o.n}
            title={`${o.name} · ${o.role}`}
            className={`flex items-center gap-1.5 rounded-full border border-line bg-panel2 py-0.5 pl-1.5 pr-2 ${
              typingObs === o.n ? "typing-ring border-amber/70" : ""
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: o.color }} />
            <span className="font-mono text-[10px] text-dim">{o.tag}</span>
            {typingObs === o.n && (
              <span className="font-mono text-[9px] text-amber">печатает…</span>
            )}
            {o.muted && <IcMicOff className="h-2.5 w-2.5 text-rec/80" />}
          </span>
        ))}
      </div>

      {/* панель инструментов */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        <button
          className={toolBtn}
          onClick={() => {
            insertAtCursor(stampRow(""));
            onEvent("doc", "Н-1: добавлена отметка времени");
          }}
          title="Вставить отметку [Н-1 · время] в позицию курсора"
        >
          <IcClock className="h-3.5 w-3.5" />
          + ВРЕМЯ
        </button>
        <button
          className={toolBtn}
          onClick={() => {
            appendLine(
              `\n\n── БЛОК: НАЧАЛО ДОПРОСА ──────────────────────${stampRow(
                "Права разъяснены (ст. 51 Конституции РФ), роспись получена.",
              )}${stampRow("Присутствуют: следователь, фигурант, защитник.")}${stampRow(
                "Аудиоканал «Допросная №2» — контроль уровня подтверждён.",
              )}`,
            );
            onEvent("doc", "Вставлен шаблон «Начало допроса»");
          }}
        >
          <IcPlus className="h-3.5 w-3.5" />
          НАЧАЛО
        </button>
        <button
          className={toolBtn}
          onClick={() => {
            appendLine(
              `\n\n── БЛОК: ПОКАЗАНИЯ ──────────────────────────${stampRow(
                "Вопрос следователя: …",
              )}${stampRow("Ответ фигуранта: …")}${stampRow(
                "Реакция (жесты, паузы, мимика): …",
              )}`,
            );
            onEvent("doc", "Вставлен шаблон «Показания»");
          }}
        >
          <IcFile className="h-3.5 w-3.5" />
          ПОКАЗАНИЯ
        </button>
        <button
          className={`${toolBtn} ${
            confirmClear
              ? "!border-rec/70 !bg-rec/10 !text-rec"
              : "hover:!border-rec/50 hover:!text-rec"
          }`}
          onClick={() => {
            if (!confirmClear) {
              setConfirmClear(true);
              window.clearTimeout(clearTimer.current);
              clearTimer.current = window.setTimeout(() => setConfirmClear(false), 2600);
              return;
            }
            setText("");
            persist("");
            setConfirmClear(false);
            onEvent("doc", "Протокол очищен (Н-1)");
          }}
        >
          <IcTrash className="h-3.5 w-3.5" />
          {confirmClear ? "ТОЧНО?" : "ОЧИСТИТЬ"}
        </button>
      </div>

      {/* бланк */}
      <div className="min-h-0 flex-1 px-3 pb-3">
        <textarea
          ref={taRef}
          value={text}
          onChange={onChange}
          spellCheck={false}
          placeholder="Введите запись протокола…"
          className="paper h-full min-h-[200px] w-full resize-none rounded-sm border border-line2 px-3 pl-[54px] text-[12.5px] font-body leading-[30px] shadow-[inset_0_2px_10px_rgba(10,20,35,0.08)] transition-shadow focus:outline-none focus:ring-1 focus:ring-hud/60"
        />
      </div>

      {/* нижняя строка */}
      <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-line px-3 font-mono text-[10px] text-faint">
        <span className="tabular-nums">{text.length} симв.</span>
        <span className="tabular-nums">{words} слов</span>
        <span className="tabular-nums">{entries} записей</span>
        <span className="ml-auto flex items-center gap-1.5">
          <IcSave className="h-3.5 w-3.5" />
          {saveState === "saving" ? (
            <span className="text-amber">сохранение…</span>
          ) : (
            <span>
              сохранено <span className="text-dim tabular-nums">{savedAt}</span>
            </span>
          )}
        </span>
      </footer>
    </Panel>
  );
}
