import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  PHRASES,
  SEED_PROTOCOL,
  PROTOCOL_LS_KEY,
  type EventType,
  type Observer,
} from "../lib/data";
import { fmtClock, fmtDate, randInt } from "../lib/hooks";
import { Panel } from "./Panel";
import { IcClock, IcPlus, IcFile, IcTrash, IcSave, IcMicOff, IcWave, IcPdf } from "./Icons";

interface Props {
  observers: Observer[];
  onEvent: (t: EventType, s: string) => void;
  onToast: (s: string) => void;
}

export function ProtocolEditor({ observers, onEvent, onToast }: Props) {
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
  const [exporting, setExporting] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const observersRef = useRef(observers);
  observersRef.current = observers;
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

  /* симуляция совместной работы: подключённые коллеги дописывают наблюдения */
  useEffect(() => {
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

  /* ── выгрузка протокола в PDF (A4, многостраничный) ── */
  const exportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    onEvent("doc", "Выгрузка протокола в PDF…");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const node = pdfRef.current;
      if (!node) throw new Error("no node");
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      const data = canvas.toDataURL("image/png");
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(data, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(data, "PNG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      const d = new Date();
      const name = `protokol_nablyudeniya_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(d.getDate()).padStart(2, "0")}_${fmtClock(d).replace(/:/g, "-")}.pdf`;
      pdf.save(name);
      onToast(`PDF выгружен: ${name}`);
      onEvent("doc", "Протокол выгружен в PDF (А4)");
    } catch {
      onToast("Ошибка выгрузки PDF — повторите попытку");
      onEvent("doc", "Ошибка выгрузки PDF");
    } finally {
      setExporting(false);
    }
  };

  const toolBtn =
    "flex h-7 items-center gap-1.5 rounded-md border border-line bg-panel2 px-2.5 font-mono text-[10px] tracking-wider text-dim transition-all hover:border-line2 hover:text-fg active:scale-95";

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const entries = (text.match(/^\[Н-/gm) || []).length;
  const nowD = new Date();

  return (
    <Panel
      title="ПРОТОКОЛ НАБЛЮДЕНИЯ"
      sub={`совместный редактор · ${observers.length} в сети`}
      className="min-h-[420px] flex-1 lg:min-h-0 lg:flex-[3]"
      delay={120}
      right={
        <>
          <button
            onClick={exportPdf}
            disabled={exporting}
            title="Выгрузить протокол в PDF (А4)"
            className="rt-grad-bg flex h-7 items-center gap-1.5 rounded-md px-2.5 font-mono text-[10px] font-semibold tracking-wider text-white shadow-[0_2px_12px_rgba(122,92,245,0.4)] transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
          >
            <IcPdf className="h-3.5 w-3.5" />
            {exporting ? "ЭКСПОРТ…" : "PDF"}
          </button>
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-raise px-2 py-0.5 font-mono text-[10px] text-dim sm:flex">
            <IcWave className="h-3 w-3 text-live" />
            автосинхронизация
          </span>
        </>
      }
    >
      {/* присутствие подключённых наблюдателей */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2.5">
        {observers.length === 0 && (
          <span className="font-mono text-[10px] text-faint">
            в канале пока никого — подключите наблюдателей в аудиопанели
          </span>
        )}
        {observers.map((o) => (
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
          className="paper h-full min-h-[200px] w-full resize-none rounded-md border border-line2 px-3 pl-[54px] text-[12.5px] font-body leading-[30px] shadow-[inset_0_2px_10px_rgba(10,20,35,0.08)] transition-shadow focus:outline-none focus:ring-1 focus:ring-hud/60"
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

      {/* скрытый макет для рендера PDF */}
      <div
        ref={pdfRef}
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 794,
          background: "#ffffff",
          color: "#101d38",
          fontFamily: "'Golos Text', 'Segoe UI', Arial, sans-serif",
        }}
      >
        <div style={{ padding: "44px 52px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  fontFamily: "'Unbounded', Arial, sans-serif",
                  fontSize: 21,
                  fontWeight: 800,
                  color: "#0e2a9e",
                  letterSpacing: "0.05em",
                }}
              >
                РОСТЕЛЕКОМ
              </div>
              <div style={{ fontSize: 11, color: "#5a6a8c", marginTop: 3 }}>
                Видеонаблюдение · Пульт наблюдения «Допросная №2» · СИЗО-1, пост 7
              </div>
            </div>
            <div
              style={{
                width: 132,
                height: 8,
                borderRadius: 4,
                background: "linear-gradient(90deg,#00b0f0,#7a5cf5,#f04e9a,#ff8a3d)",
              }}
            />
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "26px 0 5px" }}>
            Протокол совместного наблюдения — Допросная №2
          </h1>
          <div style={{ fontSize: 12, color: "#46536e", lineHeight: 1.55 }}>
            Дело № 2026/0417 · ст. 159 ч. 4 УК РФ · Фигурант: Савельев Д. И.
            <br />
            Дата выгрузки: {fmtDate(nowD)}, {fmtClock(nowD)} · Видео: MACROSCOP CAM 01–03 · Аудио:
            Mumble «Допросная №2»
          </div>
          <div style={{ height: 1, background: "#d7deea", margin: "16px 0" }} />

          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontSize: 11.5,
              lineHeight: 1.75,
              margin: 0,
            }}
          >
            {text || "(протокол пуст)"}
          </pre>

          <div style={{ height: 1, background: "#d7deea", margin: "22px 0 14px" }} />
          <div style={{ fontSize: 11.5, color: "#46536e", lineHeight: 1.6 }}>
            Заполнен совместно наблюдателями, подключёнными к каналу ({observers.length}):{" "}
            {observers.length > 0
              ? observers.map((o) => `${o.tag} — ${o.name} (${o.role})`).join("; ")
              : "—"}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 48,
              fontSize: 12,
              color: "#101d38",
            }}
          >
            <span>Старший смены: __________________ / Соколов /</span>
            <span>Оператор записи: __________________</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}
