import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { PHRASES, docLsKey, renderTemplate, type EventType, type Observer } from "../lib/data";
import { useStore } from "../lib/store";
import { log } from "../lib/logger";
import { fmtClock, randInt } from "../lib/hooks";
import {
  loadDocsApi,
  buildEditorConfig,
  type DocsEditorInstance,
} from "../lib/onlyoffice";
import { buildProtocolDocx, docxFilename } from "../lib/docxgen";
import { downloadBlob, getTemplateFile } from "../lib/filedb";
import { backend } from "../lib/backend";
import { Panel } from "./Panel";
import { IcSignal, IcSave, IcFile, IcPen, IcEye, IcTemplate } from "./Icons";

const SEED_DOC = `ПРОТОКОЛ СОВМЕСТНОГО НАБЛЮДЕНИЯ
Дело № 2026/0417 · документ комнаты открыт для совместного редактирования через ONLYOFFICE Docs.

── ЗАПИСИ СОАВТОРОВ ───────────────────────────────

[Н-2 · 14:02:47] Фигурант спокоен, отвечает односложно.
[Н-4 · 14:05:12] Отмечаю: избегает зрительного контакта со следователем.`;

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
  const { config, room, me, getTemplate, templateTick } = useStore();
  const oo = config.onlyoffice;
  const canEdit = !!me && (me.isAdmin || me.edit.includes(room.id));

  /* стартовое содержимое — шаблон комнаты (с подстановкой переменных) */
  const seedDoc = useMemo(() => {
    const tpl = getTemplate(room.id);
    return tpl.trim() ? renderTemplate(tpl, room) : SEED_DOC;
  }, [getTemplate, room]);

  const [mode, setMode] = useState<ConnMode>("offline");
  const [docTitle, setDocTitle] = useState(room.docTitle);

  /* ---- содержимое документа (встроенный режим) ---- */
  const [text, setText] = useState<string>(() => {
    try {
      return localStorage.getItem(docLsKey(room.id)) ?? seedDoc;
    } catch {
      return seedDoc;
    }
  });
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [savedAt, setSavedAt] = useState<string>(() => fmtClock(new Date()));
  const [typingObs, setTypingObs] = useState<number | null>(null);
  const [ribbon, setRibbon] = useState<RemoteEdit | null>(null);
  const [ribbonFade, setRibbonFade] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [tplFileName, setTplFileName] = useState<string | null>(null);

  /* имя загруженного docx-шаблона комнаты (для чипа) */
  useEffect(() => {
    let alive = true;
    getTemplateFile(room.id)
      .then((f) => alive && setTplFileName(f ? f.name : null))
      .catch(() => alive && setTplFileName(null));
    return () => {
      alive = false;
    };
  }, [room.id, templateTick]);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const ooMountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<DocsEditorInstance | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const saveTimer = useRef(0);
  const typingTimer = useRef(0);
  const ribbonTimer = useRef(0);
  const observersRef = useRef(observers);
  observersRef.current = observers;

  const revRef = useRef(0);

  /* смена комнаты — другой документ: сначала локальная копия, затем БД */
  useEffect(() => {
    setDocTitle(room.docTitle);
    let cancelled = false;
    try {
      setText(localStorage.getItem(docLsKey(room.id)) ?? seedDoc);
    } catch {
      setText(seedDoc);
    }
    revRef.current = 0;
    if (backend.online) {
      backend
        .fetchDocument(room.id)
        .then((row) => {
          if (cancelled) return;
          if (row) {
            setText(row.content);
            revRef.current = row.rev;
            log.debug("DB", `Протокол комнаты загружен из БД`, `rev=${row.rev} · ${row.content.length} симв.`);
          }
        })
        .catch((e) => log.error("DB", "Не удалось загрузить протокол из БД", String(e)));
    }
    setSavedAt(fmtClock(new Date()));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  /* шаблон применили из админ-панели — перечитать документ комнаты */
  useEffect(() => {
    if (templateTick === 0) return;
    try {
      const v = localStorage.getItem(docLsKey(room.id));
      if (v !== null) {
        setText(v);
        setSaveState("saved");
        setSavedAt(fmtClock(new Date()));
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateTick]);

  /* ---- автосохранение ---- */
  const persist = (val: string) => {
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(docLsKey(room.id), val);
      } catch {
        /* ignore */
      }
      setSaveState("saved");
      setSavedAt(fmtClock(new Date()));
      /* дублируем в PostgreSQL с инкрементом ревизии */
      if (backend.online) {
        revRef.current += 1;
        backend.saveDocument(room.id, val, me?.name ?? null, revRef.current).catch((e) =>
          log.error("DB", "Не удалось сохранить протокол в БД", String(e)),
        );
      }
    }, 700);
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    persist(e.target.value);
  };

  /* ---- действия с шаблоном комнаты ---- */
  const insertTemplateAtCursor = () => {
    setTplOpen(false);
    if (mode === "online") {
      onToast("Вставка шаблона доступна во встроенном режиме");
      return;
    }
    const el = taRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + seedDoc + text.slice(end);
    setText(next);
    persist(next);
    onToast("Шаблон вставлен в позицию курсора");
  };

  const replaceWithTemplate = () => {
    setTplOpen(false);
    if (mode === "online") {
      onToast("Замена по шаблону доступна во встроенном режиме");
      return;
    }
    setText(seedDoc);
    persist(seedDoc);
    onEvent("doc", `Документ перезаписан по шаблону комнаты ${room.code}`);
    onToast(`Документ заменён шаблоном «${room.code}»`);
  };

  /* ---- выгрузка протокола как полноценного .docx ---- */
  const [exporting, setExporting] = useState(false);
  const exportDocx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await buildProtocolDocx({
        title: docTitle.trim() || `Протокол наблюдения · ${room.code}`,
        roomCode: room.code,
        roomName: room.name,
        content: textRef.current,
        authors: observers.map((o) => `${o.tag} ${o.name}`),
      });
      const name = docxFilename(docTitle.trim() || `protokol_${room.code}`);
      downloadBlob(blob, name);
      onToast(`Протокол выгружен: ${name}`);
      onEvent("doc", `Документ выгружен как .docx: ${name}`);
    } catch (err) {
      log.error("DOCX", "Ошибка формирования протокола .docx", err instanceof Error ? err.message : String(err));
      onToast("Не удалось сформировать .docx");
    } finally {
      setExporting(false);
    }
  };

  /* ---- подключение ONLYOFFICE Docs по конфигурации серверов ---- */
  useEffect(() => {
    if (!oo.enabled) {
      log.info("ONLYOFFICE", "Сервер отключён администратором — подключение не выполняется");
      setMode("offline");
      return;
    }
    let alive = true;
    setMode("connecting");
    log.info("ONLYOFFICE", "Инициируем подключение к Document Server", oo.dsUrl);
    onEvent("doc", `ONLYOFFICE: подключение к ${oo.dsUrl} …`);
    loadDocsApi(oo.dsUrl.trim())
      .then(() => {
        if (!alive || !ooMountRef.current) return;
        log.info("ONLYOFFICE", "Формируем конфигурацию редактора", `mode=${canEdit ? "edit" : "view"}, doc=${room.docTitle}.docx`);
        const cfg = buildEditorConfig({
          title: `${room.docTitle}.docx`,
          docKey: room.docKey,
          docUrl: oo.docUrl,
          mode: canEdit ? "edit" : "view",
          user: me ? { id: me.id, name: me.name } : { id: "anon", name: "Наблюдатель" },
          token: oo.jwt || undefined,
          events: {
            onAppReady: () => log.info("ONLYOFFICE", "Событие onAppReady — редактор готов к работе"),
            onDocumentStateChange: (e: { data: boolean }) => {
              setSaveState(e.data ? "saving" : "saved");
              log.debug("ONLYOFFICE", `Состояние документа: ${e.data ? "есть несохранённые изменения" : "сохранено"}`);
            },
            onError: (e: { data?: { errorCode?: number; errorDescription?: string } }) => {
              log.error("ONLYOFFICE", "Событие onError от редактора", JSON.stringify(e.data ?? {}));
            },
            onInfo: (e: { data?: Record<string, unknown> }) => {
              log.debug("ONLYOFFICE", "Событие onInfo", JSON.stringify(e.data ?? {}));
            },
          },
        });
        if (!window.DocsAPI) throw new Error("DocsAPI недоступен после загрузки api.js");
        log.info("ONLYOFFICE", "Монтируем DocEditor в контейнер #oo-editor-placeholder");
        editorRef.current?.destroyEditor?.();
        editorRef.current = new window.DocsAPI.DocEditor("oo-editor-placeholder", cfg);
        setMode("online");
        log.info("ONLYOFFICE", "Редактор ONLYOFFICE подключён и смонтирован");
        onEvent("doc", `ONLYOFFICE Docs: редактор подключён (${canEdit ? "редактирование" : "только чтение"})`);
        onToast("Редактор ONLYOFFICE подключён");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setMode("offline");
        const msg = e instanceof Error ? e.message : String(e);
        log.error("ONLYOFFICE", "Подключение к Document Server не удалось", msg);
        onEvent("sys", `ONLYOFFICE: сервер не отвечает (${msg})`);
      });
    return () => {
      alive = false;
      editorRef.current?.destroyEditor?.();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oo.enabled, oo.dsUrl, oo.docUrl, oo.jwt, room.id, canEdit]);

  /* ---- симуляция правок соавторов (встроенный режим) ---- */
  useEffect(() => {
    if (mode === "online") return;
    let alive = true;
    let outer = 0;
    let inner = 0;
    const tick = () => {
      outer = window.setTimeout(() => {
        if (!alive) return;
        const candidates = observersRef.current;
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
          setText((prev) => prev + `\n[${obs.tag} · ${fmtClock(new Date())}] ${phrase}`);
          persist(textRef.current + `\n[${obs.tag} · ${fmtClock(new Date())}] ${phrase}`);
          setRibbon({ id: editId++, tag: obs.tag, name: obs.name, color: obs.color, text: phrase });
          setRibbonFade(false);
          window.clearTimeout(ribbonTimer.current);
          ribbonTimer.current = window.setTimeout(() => setRibbonFade(true), 2600);
          onEvent("doc", `${obs.tag} (${obs.name}): запись добавлена в документ`);
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
  }, [mode, room.id]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  const ooOff = !oo.enabled;
  const statusPill = ooOff
    ? "border-line bg-panel text-faint"
    : mode === "online"
      ? "border-live/60 bg-live/10 text-live"
      : mode === "connecting"
        ? "border-amber/60 bg-amber/10 text-amber blink-rec"
        : "border-line bg-panel2 text-dim";

  return (
    <Panel
      title="ПРОТОКОЛ · ONLYOFFICE"
      sub={`${room.code} · ключ ${room.docKey}`}
      className="min-h-[420px] flex-1 lg:min-h-0 lg:flex-[3]"
      delay={120}
      ledClass={
        ooOff
          ? "bg-faint"
          : mode === "online"
            ? "bg-live shadow-[0_0_8px_rgba(49,217,138,0.8)]"
            : "bg-amber shadow-[0_0_8px_rgba(255,138,61,0.8)] blink-rec"
      }
      right={
        <span className="flex items-center gap-1.5">
          <span className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] tracking-wider ${statusPill}`}>
            <IcSignal className="h-3 w-3" />
            {ooOff ? "ОТКЛЮЧЁН" : mode === "online" ? "DOCS" : mode === "connecting" ? "ПОДКЛ…" : "ОФЛАЙН"}
          </span>
          {canEdit && (
            <span className="relative">
              <button
                onClick={() => setTplOpen((v) => !v)}
                className={`flex h-7 items-center gap-1.5 rounded-md border px-2.5 font-display text-[9.5px] tracking-[0.16em] transition-all active:scale-95 ${
                  tplOpen
                    ? "border-live/70 bg-live/15 text-live"
                    : "border-line bg-panel2 text-dim hover:border-live/50 hover:text-live"
                }`}
                title="Шаблон протокола этой комнаты"
              >
                <IcTemplate className="h-3.5 w-3.5" />
                ШАБЛОН
              </button>
              {tplOpen && (
                <>
                  <span className="fixed inset-0 z-40" onClick={() => setTplOpen(false)} />
                  <span className="absolute right-0 top-full z-50 mt-1.5 flex w-56 flex-col overflow-hidden rounded-md border border-line2 bg-panel2 shadow-2xl">
                    <button
                      onClick={insertTemplateAtCursor}
                      className="px-3 py-2 text-left font-mono text-[10.5px] text-dim transition-all hover:bg-live/10 hover:text-live"
                    >
                      Вставить в позицию курсора
                    </button>
                    <button
                      onClick={replaceWithTemplate}
                      className="border-t border-line px-3 py-2 text-left font-mono text-[10.5px] text-dim transition-all hover:bg-amber/10 hover:text-amber"
                    >
                      Заменить документ шаблоном
                    </button>
                  </span>
                </>
              )}
            </span>
          )}
          <button
            onClick={exportDocx}
            disabled={exporting}
            className="rt-grad-bg flex h-7 items-center gap-1.5 rounded-md px-2.5 font-display text-[9.5px] tracking-[0.16em] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:saturate-50"
            title="Скачать протокол как документ .docx"
          >
            <IcSave className="h-3.5 w-3.5" />
            {exporting ? "…" : "DOCX"}
          </button>
        </span>
      }
    >
      {ooOff && (
        <div className="mx-3 mt-2.5 flex items-center gap-2 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 font-mono text-[10px] tracking-wide text-amber">
          <IcFile className="h-3.5 w-3.5 shrink-0" />
          ONLYOFFICE Docs отключён в настройках серверов. Включите его в панели «Серверы» (админ).
        </div>
      )}
      {/* строка документа: название, соавторы, права */}
      <div className="flex flex-wrap items-center gap-2 px-3 pt-2.5">
        <IcFile className="h-4 w-4 shrink-0 text-hud" />
        <input
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          className="h-7 min-w-[160px] flex-1 rounded-md border border-transparent bg-transparent px-2 font-mono text-[11.5px] text-fg outline-none transition-all hover:border-line focus:border-hud/60 focus:bg-panel2"
        />
        {tplFileName && (
          <span
            className="flex items-center gap-1.5 rounded-full border border-violet/50 bg-violet/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-violet"
            title={`Документ создан на основе docx-шаблона: ${tplFileName}`}
          >
            <IcFile className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{tplFileName}</span>
          </span>
        )}
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] tracking-wider ${
            canEdit ? "border-live/50 bg-live/10 text-live" : "border-line bg-panel2 text-faint"
          }`}
          title={canEdit ? "Вам разрешено редактирование" : "Только чтение — нет прав на редактирование"}
        >
          {canEdit ? <IcPen className="h-3 w-3" /> : <IcEye className="h-3 w-3" />}
          {canEdit ? "РЕДАКТИРОВАНИЕ" : "ТОЛЬКО ЧТЕНИЕ"}
        </span>
        <div className="flex items-center -space-x-1.5">
          {me && (
            <span
              title={`${me.name} (вы)`}
              className="grid h-6 w-6 place-items-center rounded-full border-2 border-panel font-display text-[8.5px] font-bold text-ink"
              style={{ background: me.color }}
            >
              {me.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          {observers.map((o) => (
            <span
              key={o.n}
              title={`${o.name} · ${o.role}`}
              className={`grid h-6 w-6 place-items-center rounded-full border-2 border-panel font-display text-[8.5px] font-bold text-ink ${
                typingObs === o.n ? "typing-ring" : ""
              }`}
              style={{ background: o.color }}
            >
              {o.name.slice(0, 2).toUpperCase()}
            </span>
          ))}
          <span className="pl-3 font-mono text-[9.5px] text-faint">{observers.length + 1} в сети</span>
        </div>
      </div>

      {/* лента правки соавтора */}
      <div className="relative px-3 pt-2">
        {ribbon && (
          <div
            className={`rise flex items-center gap-2 rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-[11px] transition-opacity duration-500 ${
              ribbonFade ? "opacity-0" : "opacity-100"
            }`}
            style={{ borderLeft: `3px solid ${ribbon.color}` }}
          >
            <span className="font-mono text-[10px] font-semibold" style={{ color: ribbon.color }}>
              {ribbon.tag}
            </span>
            <span className="truncate text-dim">{ribbon.name} добавил(а): «{ribbon.text}»</span>
          </div>
        )}
      </div>

      {/* редактор */}
      <div className="min-h-0 flex-1 px-3 py-2.5">
        {mode === "online" ? (
          <div ref={ooMountRef} className="h-full min-h-[260px] overflow-hidden rounded-md border border-line2 bg-white">
            <div id="oo-editor-placeholder" ref={placeholderRef} className="h-full w-full" />
          </div>
        ) : (
          <div className="relative h-full">
            {mode === "connecting" && (
              <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 rounded-t-md bg-amber/10 px-3 py-1.5 font-mono text-[10px] tracking-wider text-amber">
                <span className="led blink-rec bg-amber" />
                подключение к Document Server…
              </div>
            )}
            <textarea
              ref={taRef}
              value={text}
              onChange={onChange}
              readOnly={!canEdit}
              spellCheck={false}
              placeholder={canEdit ? "Введите запись протокола…" : "Документ доступен только для чтения"}
              className={`paper h-full min-h-[200px] w-full resize-none rounded-md border border-line2 px-3 pl-[54px] text-[12.5px] font-body leading-[30px] shadow-[inset_0_2px_10px_rgba(10,20,35,0.08)] transition-shadow focus:outline-none focus:ring-1 focus:ring-hud/60 ${
                !canEdit ? "cursor-default opacity-90" : ""
              }`}
            />
            {mode === "offline" && (
              <div className="absolute bottom-2 left-[62px] font-mono text-[9px] tracking-wider text-faint/80">
                локальный режим: ONLYOFFICE-сервер не отвечает — совместные правки эмулируются
              </div>
            )}
          </div>
        )}
      </div>

      {/* нижняя строка */}
      <footer className="flex h-9 shrink-0 items-center gap-4 border-t border-line px-3 font-mono text-[10px] text-faint">
        <span className="tabular-nums">{text.length} симв.</span>
        <span className="tabular-nums">{words} слов</span>
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
