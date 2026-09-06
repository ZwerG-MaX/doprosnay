import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { TEMPLATE_VARS, TEMPLATE_SNIPPETS, DEFAULT_TEMPLATES, type RoomDef } from "../lib/data";
import { useStore } from "../lib/store";
import { log } from "../lib/logger";
import {
  saveTemplateFile,
  getTemplateFile,
  deleteTemplateFile,
  downloadBlob,
  formatSize,
  type FileMeta,
} from "../lib/filedb";
import { buildTemplateDocx, docxFilename } from "../lib/docxgen";
import { IcTemplate, IcClose, IcSave, IcRefresh, IcCam, IcFile, IcTrash, IcPlus } from "./Icons";

interface Props {
  onClose: () => void;
  onToast: (s: string) => void;
}

export function TemplateManager({ onClose, onToast }: Props) {
  const { rooms, getTemplate, saveTemplate, resetTemplate, applyTemplateToDoc } = useStore();
  const ROOMS: RoomDef[] = rooms;
  const [activeId, setActiveId] = useState(ROOMS[0].id);
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const r of ROOMS) init[r.id] = getTemplate(r.id);
    return init;
  });
  const [armed, setArmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<Record<string, FileMeta | null>>({});
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = ROOMS.find((r) => r.id === activeId) ?? ROOMS[0];
  const draft = drafts[activeId] ?? "";
  const activeFile = files[activeId] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* метаинформация о загруженных docx-файлах */
  useEffect(() => {
    let alive = true;
    (async () => {
      const map: Record<string, FileMeta | null> = {};
      for (const r of ROOMS) {
        try {
          const f = await getTemplateFile(r.id);
          map[r.id] = f ? { name: f.name, size: f.size, at: f.at } : null;
        } catch {
          map[r.id] = null;
        }
      }
      if (alive) setFiles(map);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/\.docx$/i.test(f.name)) {
      onToast("Поддерживаются только файлы .docx");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      onToast("Файл больше 8 МБ — загрузите документ меньшего размера");
      return;
    }
    setUploading(true);
    try {
      const arrayBuffer = await f.arrayBuffer();
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      await saveTemplateFile(activeId, {
        blob: new Blob([arrayBuffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        name: f.name,
        size: f.size,
        at: new Date().toISOString(),
      });
      const at = new Date().toISOString();
      setFiles((prev) => ({ ...prev, [activeId]: { name: f.name, size: f.size, at } }));
      const text = value.trim();
      if (text) {
        setDrafts((prev) => ({ ...prev, [activeId]: text }));
        setArmed(false);
      }
      log.info("TEMPLATE", `Загружен DOCX-шаблон для комнаты ${active.code}`, `${f.name} · ${formatSize(f.size)}`);
      onToast(text ? `«${f.name}» загружен, текст извлечён в редактор` : `«${f.name}» загружен`);
    } catch (err) {
      log.error("TEMPLATE", "Не удалось прочитать .docx", err instanceof Error ? err.message : String(err));
      onToast("Не удалось прочитать файл .docx");
    } finally {
      setUploading(false);
    }
  };

  const onDeleteFile = async () => {
    try {
      await deleteTemplateFile(activeId);
      setFiles((prev) => ({ ...prev, [activeId]: null }));
      log.info("TEMPLATE", `DOCX-файл шаблона удалён для комнаты ${active.code}`);
      onToast("Файл шаблона удалён — остался текстовый шаблон");
    } catch {
      onToast("Не удалось удалить файл");
    }
  };

  const onDownloadDocx = async () => {
    try {
      const stored = await getTemplateFile(activeId);
      if (stored) {
        downloadBlob(stored.blob, stored.name);
        onToast(`Выгружен исходный файл: ${stored.name}`);
        return;
      }
      const blob = await buildTemplateDocx(`Шаблон протокола · ${active.code}`, draft);
      downloadBlob(blob, docxFilename(`shablon_${active.code}`));
      onToast("Текстовый шаблон выгружен как .docx");
      log.info("TEMPLATE", `Шаблон ${active.code} выгружен в .docx`);
    } catch (err) {
      log.error("TEMPLATE", "Ошибка формирования .docx", err instanceof Error ? err.message : String(err));
      onToast("Не удалось сформировать .docx");
    }
  };

  const usedVars = useMemo(
    () => TEMPLATE_VARS.filter((v) => draft.includes(v)),
    [draft],
  );
  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const setDraft = (v: string) => setDrafts((prev) => ({ ...prev, [activeId]: v }));

  const insertAtCursor = (snippet: string) => {
    const el = taRef.current;
    if (!el) {
      setDraft(draft + snippet);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + snippet + draft.slice(end);
    setDraft(next);
    window.requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  };

  const isDirty = draft !== getTemplate(activeId);

  const handleSave = () => {
    saveTemplate(activeId, draft);
    onToast(`Шаблон для «${active.code} · ${active.name}» сохранён`);
    setArmed(false);
  };

  const handleReset = () => {
    resetTemplate(activeId);
    setDrafts((prev) => ({ ...prev, [activeId]: DEFAULT_TEMPLATES[activeId] ?? "" }));
    onToast(`Шаблон «${active.code}» сброшен к стандартному`);
  };

  const handleApply = () => {
    if (!armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 3000);
      return;
    }
    saveTemplate(activeId, draft);
    applyTemplateToDoc(activeId);
    onToast(`Документ комнаты «${active.code}» перезаписан по шаблону`);
    setArmed(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" onClick={onClose} />
      <div className="rise relative flex max-h-full w-full max-w-[720px] flex-col overflow-hidden rounded-xl border border-line2 bg-panel shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-panel2/70 px-4">
          <IcTemplate className="h-4.5 w-4.5 text-live" />
          <h2 className="font-display text-[12px] tracking-[0.18em] text-fg">ШАБЛОНЫ ПРОТОКОЛОВ</h2>
          <span className="hidden font-mono text-[9.5px] text-faint sm:block">свой шаблон для каждой комнаты</span>
          <button
            onClick={onClose}
            title="Закрыть (ESC)"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-dim transition-all hover:border-rec/60 hover:text-rec active:scale-95"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </header>
        <div className="rt-stripe" />

        {/* вкладки комнат */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pt-3">
          {ROOMS.map((r) => {
            const on = r.id === activeId;
            return (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 transition-all duration-150 active:scale-[0.97] ${
                  on
                    ? "border-live/70 bg-live/12 text-fg shadow-[0_0_14px_rgba(49,217,138,0.18)]"
                    : "border-line bg-panel2 text-dim hover:border-line2 hover:text-fg"
                }`}
              >
                <IcCam className={`h-3.5 w-3.5 ${on ? "text-live" : "text-faint"}`} />
                <span className="font-display text-[10px] tracking-[0.14em]">{r.code}</span>
                <span className="hidden max-w-[130px] truncate font-mono text-[9px] text-faint sm:block">{r.name}</span>
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {/* переменные */}
          <div className="rounded-lg border border-line bg-panel2/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[9px] tracking-[0.2em] text-faint">ПЕРЕМЕННЫЕ · клик вставит в позицию курсора</span>
              <span className="font-mono text-[9px] text-live">{usedVars.length}/{TEMPLATE_VARS.length} используется</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map((v) => {
                const used = draft.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => insertAtCursor(v)}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[10px] transition-all active:scale-95 ${
                      used
                        ? "border-live/60 bg-live/10 text-live"
                        : "border-line bg-panel text-dim hover:border-live/50 hover:text-live"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
              {TEMPLATE_SNIPPETS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => insertAtCursor(s.text)}
                  title="Вставить блок"
                  className="rounded-full border border-line bg-panel px-2.5 py-1 font-mono text-[10px] text-dim transition-all hover:border-hud/50 hover:text-hud active:scale-95"
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* DOCX-файл шаблона */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-panel2/50 px-3 py-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={onUpload}
            />
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-panel text-violet">
              <IcFile className="h-4 w-4" />
            </span>
            {activeFile ? (
              <>
                <div className="min-w-0">
                  <div className="truncate font-mono text-[11px] font-semibold text-fg">
                    {activeFile.name}
                  </div>
                  <div className="font-mono text-[9px] tracking-wider text-faint">
                    {formatSize(activeFile.size)} · загружен {new Date(activeFile.at).toLocaleString("ru-RU")}
                  </div>
                </div>
                <button
                  onClick={onDeleteFile}
                  title="Удалить docx-файл шаблона"
                  className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-md border border-line bg-panel text-faint transition-all hover:border-rec/60 hover:text-rec active:scale-90"
                >
                  <IcTrash className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 font-mono text-[9.5px] tracking-widest text-dim transition-all hover:border-violet/50 hover:text-violet active:scale-95"
                >
                  ЗАМЕНИТЬ
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] text-dim">Файл шаблона не загружен</div>
                  <div className="font-mono text-[9px] tracking-wider text-faint">
                    загрузите .docx — текст извлечётся в редактор, файл сохранится для ONLYOFFICE
                  </div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-violet/50 bg-violet/10 px-3 font-mono text-[9.5px] tracking-widest text-violet transition-all hover:bg-violet/20 active:scale-95 disabled:opacity-50"
                >
                  <IcPlus className="h-3.5 w-3.5" />
                  {uploading ? "ЧТЕНИЕ…" : "ЗАГРУЗИТЬ .DOCX"}
                </button>
              </>
            )}
          </div>

          {/* редактор шаблона */}
          <div className="flex min-h-[260px] flex-col rounded-lg border border-line bg-panel2/50">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <span className="font-mono text-[9px] tracking-[0.2em] text-faint">
                ШАБЛОН · {active.code} · {active.name.toUpperCase()}
              </span>
              <span className="font-mono text-[9px] text-faint tabular-nums">
                {draft.length} симв. · {words} слов
              </span>
            </div>
            <textarea
              ref={taRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              spellCheck={false}
              placeholder="Введите текст шаблона протокола…"
              className="min-h-[220px] w-full flex-1 resize-none bg-transparent px-3 py-2.5 font-mono text-[12px] leading-relaxed text-fg outline-none placeholder:text-faint"
            />
          </div>

          {isDirty && (
            <p className="px-1 font-mono text-[9.5px] tracking-wide text-amber">
              ● есть несохранённые изменения шаблона «{active.code}»
            </p>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-panel2/50 px-4 py-3">
          <button
            onClick={handleReset}
            className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-panel px-3 font-mono text-[10px] tracking-widest text-faint transition-all hover:border-amber/50 hover:text-amber active:scale-95"
          >
            <IcRefresh className="h-3.5 w-3.5" />
            СБРОСИТЬ
          </button>
          <button
            onClick={handleApply}
            className={`flex h-9 items-center rounded-md border px-3 font-mono text-[10px] tracking-widest transition-all active:scale-95 ${
              armed
                ? "border-rec/70 bg-rec/15 text-rec"
                : "border-line bg-panel text-dim hover:border-hud/50 hover:text-hud"
            }`}
            title="Перезаписать документ комнаты по этому шаблону"
          >
            {armed ? "ТОЧНО ПЕРЕЗАПИСАТЬ?" : "ПРИМЕНИТЬ К ДОКУМЕНТУ"}
          </button>
          <button
            onClick={onDownloadDocx}
            className="flex h-9 items-center gap-1.5 rounded-md border border-violet/50 bg-violet/10 px-3 font-mono text-[10px] tracking-widest text-violet transition-all hover:bg-violet/20 active:scale-95"
            title={activeFile ? "Скачать исходный docx-файл" : "Выгрузить текстовый шаблон как .docx"}
          >
            <IcFile className="h-3.5 w-3.5" />
            СКАЧАТЬ .DOCX
          </button>
          <span className="ml-auto font-mono text-[9.5px] text-faint">
            {isDirty ? "не сохранено" : "сохранено"}
          </span>
          <button
            onClick={onClose}
            className="flex h-9 items-center rounded-md border border-line bg-panel px-3.5 font-mono text-[10px] tracking-widest text-dim transition-all hover:border-line2 hover:text-fg active:scale-95"
          >
            ЗАКРЫТЬ
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="rt-grad-bg flex h-9 items-center gap-1.5 rounded-md px-4 font-display text-[10.5px] tracking-[0.18em] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-35 disabled:saturate-50"
          >
            <IcSave className="h-3.5 w-3.5" />
            СОХРАНИТЬ
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
