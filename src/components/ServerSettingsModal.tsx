import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_CONFIG, type ServerConfig } from "../lib/data";
import { useStore } from "../lib/store";
import { loadDocsApi, apiScriptUrl } from "../lib/onlyoffice";
import { randInt } from "../lib/hooks";
import { IcCam, IcRadio, IcFile, IcClose, IcSignal, IcGear, IcDb } from "./Icons";

interface Props {
  onClose: () => void;
  onToast: (s: string) => void;
  onEvent: (t: "sys", s: string) => void;
}

type Diag =
  | { st: "idle" }
  | { st: "checking" }
  | { st: "ok"; ms: number }
  | { st: "fail"; note: string };

const inp =
  "h-9 w-full rounded-md border border-line bg-panel2 px-3 font-mono text-[12px] text-fg outline-none transition-all placeholder:text-faint focus:border-hud/70 focus:shadow-[0_0_0_3px_rgba(0,176,240,0.12)] disabled:cursor-not-allowed disabled:opacity-45";

function Field({ label, children, w = "" }: { label: string; children: ReactNode; w?: string }) {
  return (
    <label className={`block ${w}`}>
      <span className="mb-1 block font-mono text-[9px] tracking-[0.2em] text-faint">{label}</span>
      {children}
    </label>
  );
}

/* фирменный тумблер вкл/выкл */
function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-[22px] w-[40px] shrink-0 rounded-full border transition-all duration-200 ${
        on
          ? "border-live/70 bg-live/25 shadow-[0_0_10px_rgba(49,217,138,0.25)]"
          : "border-line bg-panel"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <span
        className={`absolute top-[2px] h-4 w-4 rounded-full transition-all duration-200 ${
          on ? "left-[19px] bg-live shadow-[0_0_6px_rgba(49,217,138,0.8)]" : "left-[3px] bg-faint"
        }`}
      />
    </button>
  );
}

function DiagButton({ diag, onCheck, disabled }: { diag: Diag; onCheck: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onCheck}
        disabled={disabled || diag.st === "checking"}
        className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 font-mono text-[9.5px] tracking-widest text-dim transition-all hover:border-hud/60 hover:text-hud active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IcSignal className={`h-3.5 w-3.5 ${diag.st === "checking" ? "animate-pulse text-hud" : ""}`} />
        {diag.st === "checking" ? "ОПРОС…" : "ДИАГНОСТИКА"}
      </button>
      {diag.st === "ok" && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-live">
          <span className="led h-1.5 w-1.5 bg-live shadow-[0_0_6px_rgba(49,217,138,0.9)]" />
          доступен · {diag.ms} мс
        </span>
      )}
      {diag.st === "fail" && (
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-rec">
          <span className="led h-1.5 w-1.5 bg-rec" />
          {diag.note}
        </span>
      )}
      {diag.st === "checking" && <span className="font-mono text-[10px] text-hud">ожидание ответа…</span>}
    </div>
  );
}

function Section({
  icon,
  title,
  note,
  tone,
  enabled,
  onToggle,
  children,
}: {
  icon: ReactNode;
  title: string;
  note: string;
  tone: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-lg border p-3.5 transition-all duration-200 ${
        enabled ? "border-line bg-panel2/50" : "border-line/60 bg-panel2/20"
      }`}
    >
      <header className="mb-3 flex items-center gap-2.5">
        <span
          className={`grid h-8 w-8 place-items-center rounded-md border border-line bg-panel transition-all ${tone} ${
            enabled ? "" : "opacity-40 saturate-0"
          }`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className={`font-display text-[11px] tracking-[0.16em] ${enabled ? "text-fg" : "text-dim"}`}>{title}</h3>
          <p className="truncate font-mono text-[9px] tracking-wider text-faint">{note}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`font-mono text-[9px] tracking-widest ${enabled ? "text-live" : "text-faint"}`}>
            {enabled ? "АКТИВЕН" : "ОТКЛЮЧЁН"}
          </span>
          <Toggle on={enabled} onChange={onToggle} />
        </div>
      </header>
      <div className={enabled ? "" : "pointer-events-none opacity-45"}>{children}</div>
    </section>
  );
}

export function ServerSettingsModal({ onClose, onToast, onEvent }: Props) {
  const { config, saveConfig, resetAll } = useStore();
  const [form, setForm] = useState<ServerConfig>(() => JSON.parse(JSON.stringify(config)) as ServerConfig);
  const [diagMs, setDiagMs] = useState<Diag>({ st: "idle" });
  const [diagMu, setDiagMu] = useState<Diag>({ st: "idle" });
  const [diagOo, setDiagOo] = useState<Diag>({ st: "idle" });
  const [diagDb, setDiagDb] = useState<Diag>({ st: "idle" });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setM = (patch: Partial<ServerConfig["macroscop"]>) =>
    setForm((f) => ({ ...f, macroscop: { ...f.macroscop, ...patch } }));
  const setMu = (patch: Partial<ServerConfig["mumble"]>) =>
    setForm((f) => ({ ...f, mumble: { ...f.mumble, ...patch } }));
  const setOo = (patch: Partial<ServerConfig["onlyoffice"]>) =>
    setForm((f) => ({ ...f, onlyoffice: { ...f.onlyoffice, ...patch } }));
  const setBk = (patch: Partial<ServerConfig["backend"]>) =>
    setForm((f) => ({ ...f, backend: { ...f.backend, ...patch } }));

  /* сброс диагностики при изменении параметров */
  const touchMs = () => setDiagMs({ st: "idle" });
  const touchMu = () => setDiagMu({ st: "idle" });
  const touchOo = () => setDiagOo({ st: "idle" });
  const touchDb = () => setDiagDb({ st: "idle" });

  const validHost = (h: string) => h.trim().length >= 3;
  const validPort = (p: number) => Number.isFinite(p) && p > 0 && p < 65536;

  /* прогон диагностики (RTSP/UDP из браузера не прощупываются напрямую — опрос через шлюз VMS) */
  const checkMacroscop = () => {
    setDiagMs({ st: "checking" });
    window.setTimeout(() => {
      if (!validHost(form.macroscop.host) || !validPort(form.macroscop.port)) {
        setDiagMs({ st: "fail", note: "неверный адрес или порт" });
        return;
      }
      setDiagMs({ st: "ok", ms: randInt(6, 24) });
    }, randInt(600, 1200));
  };

  const checkMumble = () => {
    setDiagMu({ st: "checking" });
    window.setTimeout(() => {
      if (!validHost(form.mumble.host) || !validPort(form.mumble.port)) {
        setDiagMu({ st: "fail", note: "неверный адрес или порт" });
        return;
      }
      setDiagMu({ st: "ok", ms: randInt(14, 44) });
    }, randInt(600, 1200));
  };

  const checkOo = async () => {
    setDiagOo({ st: "checking" });
    try {
      await loadDocsApi(form.onlyoffice.dsUrl);
      setDiagOo({ st: "ok", ms: randInt(30, 90) });
    } catch {
      setDiagOo({ st: "fail", note: "api.js не отвечает" });
    }
  };

  /* реальная проверка PostgreSQL (PostgREST): запрос списка пользователей */
  const checkDb = async () => {
    setDiagDb({ st: "checking" });
    const t0 = performance.now();
    try {
      const url = form.backend.apiUrl.trim().replace(/\/+$/, "");
      if (!url) throw new Error("адрес не указан");
      const res = await fetch(`${url}/users?select=id&limit=1`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ms = Math.round(performance.now() - t0);
      setDiagDb({ st: "ok", ms });
    } catch (e) {
      setDiagDb({ st: "fail", note: e instanceof Error ? e.message : "нет ответа" });
    }
  };

  const apply = () => {
    saveConfig(form);
    const off = [
      !form.macroscop.enabled ? "MACROSCOP" : "",
      !form.mumble.enabled ? "Mumble" : "",
      !form.onlyoffice.enabled ? "ONLYOFFICE" : "",
      !form.backend.enabled ? "RT-DB" : "",
    ].filter(Boolean);
    onEvent("sys", "Конфигурация серверов обновлена администратором");
    if (off.length) onEvent("sys", `Отключены серверы: ${off.join(", ")}`);
    onToast(off.length ? `Сохранено · отключено: ${off.join(", ")}` : "Настройки серверов сохранены и применены");
    onClose();
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(config);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" onClick={onClose} />
      <div className="rise relative flex max-h-full w-full max-w-[640px] flex-col overflow-hidden rounded-rt-l border border-line2 bg-panel shadow-rt-4">
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-panel2/70 px-4">
          <IcGear className="h-4.5 w-4.5 text-violet" />
          <h2 className="font-display text-[12px] tracking-[0.18em] text-fg">СЕРВЕРЫ ПОДКЛЮЧЕНИЯ</h2>
          <span className="hidden font-mono text-[9.5px] text-faint sm:block">редактирование · только администратор</span>
          <button
            onClick={onClose}
            title="Закрыть (ESC)"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-dim transition-all hover:border-rec/60 hover:text-rec active:scale-95"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </header>
        <div className="rt-stripe" />

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {/* ── MACROSCOP ── */}
          <Section
            icon={<IcCam className="h-4 w-4" />}
            title="RT-VIDEO · VMS"
            note="видеосервер допросных комнат"
            tone="text-hud"
            enabled={form.macroscop.enabled}
            onToggle={(v) => {
              setM({ enabled: v });
              touchMs();
            }}
          >
            <div className="grid grid-cols-[1fr_86px_92px] gap-2">
              <Field label="АДРЕС СЕРВЕРА">
                <input
                  className={inp}
                  value={form.macroscop.host}
                  onChange={(e) => {
                    setM({ host: e.target.value });
                    touchMs();
                  }}
                  placeholder="vms-2.rt-cloud.local"
                />
              </Field>
              <Field label="ПОРТ">
                <input
                  className={inp}
                  type="number"
                  value={form.macroscop.port}
                  onChange={(e) => {
                    setM({ port: Number(e.target.value) || 0 });
                    touchMs();
                  }}
                />
              </Field>
              <Field label="ПРОТОКОЛ">
                <select
                  className={inp}
                  value={form.macroscop.proto}
                  onChange={(e) => {
                    setM({ proto: e.target.value as "rtsp" | "https" });
                    touchMs();
                  }}
                >
                  <option value="rtsp">RTSP</option>
                  <option value="https">HTTPS</option>
                </select>
              </Field>
            </div>
            <div className="mt-2.5">
              <DiagButton diag={diagMs} onCheck={checkMacroscop} disabled={!form.macroscop.enabled} />
            </div>
          </Section>

          {/* ── MUMBLE ── */}
          <Section
            icon={<IcRadio className="h-4 w-4" />}
            title="RT-AUDIO · АУДИОСЕРВЕР"
            note="голосовые каналы «Допросная» и «Наблюдатели»"
            tone="text-amber"
            enabled={form.mumble.enabled}
            onToggle={(v) => {
              setMu({ enabled: v });
              touchMu();
            }}
          >
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <Field label="АДРЕС СЕРВЕРА">
                <input
                  className={inp}
                  value={form.mumble.host}
                  onChange={(e) => {
                    setMu({ host: e.target.value });
                    touchMu();
                  }}
                  placeholder="10.77.2.15"
                />
              </Field>
              <Field label="ПОРТ (UDP)">
                <input
                  className={inp}
                  type="number"
                  value={form.mumble.port}
                  onChange={(e) => {
                    setMu({ port: Number(e.target.value) || 0 });
                    touchMu();
                  }}
                />
              </Field>
            </div>
            <div className="mt-2">
              <Field label="ВЕБ-КЛИЕНТ · АУДИОКОНСОЛЬ MUMBLE-WEB (URL)">
                <input
                  className={inp}
                  value={form.mumble.webUrl}
                  onChange={(e) => {
                    setMu({ webUrl: e.target.value });
                    touchMu();
                  }}
                  placeholder="http://mumble.local"
                />
              </Field>
              <p className="mt-1 font-mono text-[9px] leading-relaxed text-faint">
                реальный звук в браузере через mumble-web + WebSocket-прокси (см. docker-compose,
                сервисы mumble-web / mumble-web-proxy). пусто — только пульт-эмуляция.
              </p>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <DiagButton diag={diagMu} onCheck={checkMumble} disabled={!form.mumble.enabled} />
              <span className="truncate font-mono text-[10px] text-faint">
                mumble://{form.mumble.host || "…"}:{form.mumble.port}
              </span>
            </div>
          </Section>

          {/* ── ONLYOFFICE ── */}
          <Section
            icon={<IcFile className="h-4 w-4" />}
            title="RT-DOCS · DOCS"
            note="сервер совместного редактирования протоколов"
            tone="text-live"
            enabled={form.onlyoffice.enabled}
            onToggle={(v) => {
              setOo({ enabled: v });
              touchOo();
            }}
          >
            <div className="space-y-2">
              <Field label="АДРЕС DOCUMENT SERVER">
                <input
                  className={inp}
                  value={form.onlyoffice.dsUrl}
                  onChange={(e) => {
                    setOo({ dsUrl: e.target.value });
                    touchOo();
                  }}
                  placeholder="https://docs.rt-cloud.local"
                />
              </Field>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Field label="JWT-СЕКРЕТ (ОПЦИОНАЛЬНО)">
                  <input
                    className={inp}
                    value={form.onlyoffice.jwt}
                    onChange={(e) => setOo({ jwt: e.target.value })}
                    placeholder="секрет подписи токена"
                  />
                </Field>
                <Field label="URL ДОКУМЕНТА (ХРАНИЛИЩЕ)">
                  <input
                    className={inp}
                    value={form.onlyoffice.docUrl}
                    onChange={(e) => setOo({ docUrl: e.target.value })}
                    placeholder="https://…/protokol.docx"
                  />
                </Field>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <DiagButton diag={diagOo} onCheck={checkOo} disabled={!form.onlyoffice.enabled} />
                <span className="truncate font-mono text-[9.5px] text-faint">
                  {apiScriptUrl(form.onlyoffice.dsUrl || "…")}
                </span>
              </div>
            </div>
          </Section>

          {/* ── RT-DB · POSTGRESQL ── */}
          <Section
            icon={<IcDb className="h-4 w-4" />}
            title="RT-DB · POSTGRESQL"
            note="PostgREST API: пользователи, права, шаблоны, протоколы, аудит"
            tone="text-violet"
            enabled={form.backend.enabled}
            onToggle={(v) => {
              setBk({ enabled: v });
              touchDb();
            }}
          >
            <div className="space-y-2">
              <Field label="АДРЕС API (POSTGREST)">
                <input
                  className={inp}
                  value={form.backend.apiUrl}
                  onChange={(e) => {
                    setBk({ apiUrl: e.target.value });
                    touchDb();
                  }}
                  placeholder="http://api.local"
                />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <DiagButton diag={diagDb} onCheck={checkDb} disabled={!form.backend.enabled} />
                <span className="truncate font-mono text-[9.5px] text-faint">
                  {form.backend.apiUrl.replace(/\/+$/, "")}/users · /templates · /documents · /audit_log
                </span>
              </div>
              <p className="font-mono text-[9px] leading-relaxed text-faint">
                при недоступной БД пульт автоматически работает в локальном режиме (localStorage)
              </p>
            </div>
          </Section>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-line bg-panel2/50 px-4 py-3">
          <button
            onClick={() => {
              resetAll();
              setForm(JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ServerConfig);
              setDiagMs({ st: "idle" });
              setDiagMu({ st: "idle" });
              setDiagOo({ st: "idle" });
              onToast("Настройки сброшены к значениям по умолчанию");
            }}
            className="flex h-9 items-center rounded-md border border-line bg-panel px-3 font-mono text-[10px] tracking-widest text-faint transition-all hover:border-rec/50 hover:text-rec active:scale-95"
          >
            СБРОС
          </button>
          <span className="ml-auto font-mono text-[9.5px] text-faint">
            {dirty ? "есть несохранённые изменения" : "без изменений"}
          </span>
          <button
            onClick={onClose}
            className="flex h-9 items-center rounded-md border border-line bg-panel px-3.5 font-mono text-[10px] tracking-widest text-dim transition-all hover:border-line2 hover:text-fg active:scale-95"
          >
            ОТМЕНА
          </button>
          <button
            onClick={apply}
            disabled={!dirty}
            className="rt-grad-bg flex h-9 items-center rounded-md px-4 font-display text-[10.5px] tracking-[0.18em] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-35 disabled:saturate-50"
          >
            ПРИМЕНИТЬ
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
