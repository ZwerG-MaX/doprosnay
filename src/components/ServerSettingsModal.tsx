import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_CONFIG, type ServerConfig } from "../lib/data";
import { useStore } from "../lib/store";
import { checkOnlyOfficeServer } from "../lib/onlyoffice";
import { IcCam, IcRadio, IcFile, IcClose, IcSignal, IcGear } from "./Icons";

interface Props {
  onClose: () => void;
  onToast: (s: string) => void;
  onEvent: (t: "sys", s: string) => void;
}

const inp =
  "h-9 w-full rounded-md border border-line bg-panel2 px-3 font-mono text-[12px] text-fg outline-none transition-all placeholder:text-faint focus:border-hud/70 focus:shadow-[0_0_0_3px_rgba(0,176,240,0.12)]";

function Field({ label, children, w = "" }: { label: string; children: React.ReactNode; w?: string }) {
  return (
    <label className={`block ${w}`}>
      <span className="mb-1 block font-mono text-[9px] tracking-[0.2em] text-faint">{label}</span>
      {children}
    </label>
  );
}

function Section({
  icon,
  title,
  note,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-panel2/50 p-3.5">
      <header className="mb-3 flex items-center gap-2.5">
        <span className={`grid h-8 w-8 place-items-center rounded-md border border-line bg-panel ${tone}`}>
          {icon}
        </span>
        <div>
          <h3 className="font-display text-[11px] tracking-[0.16em] text-fg">{title}</h3>
          <p className="font-mono text-[9px] tracking-wider text-faint">{note}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function ServerSettingsModal({ onClose, onToast, onEvent }: Props) {
  const { config, saveConfig, resetAll } = useStore();
  const [form, setForm] = useState<ServerConfig>(() => JSON.parse(JSON.stringify(config)) as ServerConfig);
  const [ooStatus, setOoStatus] = useState<"" | "checking" | "ok" | "fail">("");

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

  const apply = () => {
    saveConfig(form);
    onEvent("sys", "Конфигурация серверов обновлена администратором");
    onToast("Настройки серверов сохранены и применены");
    onClose();
  };

  const checkOo = async () => {
    setOoStatus("checking");
    try {
      await checkOnlyOfficeServer(form.onlyoffice.dsUrl);
      setOoStatus("ok");
    } catch (e) {
      setOoStatus("fail");
      console.warn(e);
    }
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(config);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" onClick={onClose} />
      <div className="rise relative flex max-h-full w-full max-w-[620px] flex-col overflow-hidden rounded-xl border border-line2 bg-panel shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-panel2/70 px-4">
          <IcGear className="h-4.5 w-4.5 text-violet" />
          <h2 className="font-display text-[12px] tracking-[0.18em] text-fg">СЕРВЕРЫ ПОДКЛЮЧЕНИЯ</h2>
          <span className="hidden font-mono text-[9.5px] text-faint sm:block">только для администратора</span>
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
          <Section
            icon={<IcCam className="h-4 w-4" />}
            title="MACROSCOP · VMS"
            note="видеосервер допросных комнат"
            tone="text-hud"
          >
            <div className="grid grid-cols-[1fr_86px_92px] gap-2">
              <Field label="АДРЕС СЕРВЕРА">
                <input className={inp} value={form.macroscop.host} onChange={(e) => setM({ host: e.target.value })} placeholder="vms-2.rt-cloud.local" />
              </Field>
              <Field label="ПОРТ">
                <input
                  className={inp}
                  type="number"
                  value={form.macroscop.port}
                  onChange={(e) => setM({ port: Number(e.target.value) || 554 })}
                />
              </Field>
              <Field label="ПРОТОКОЛ">
                <select className={inp} value={form.macroscop.proto} onChange={(e) => setM({ proto: e.target.value as "rtsp" | "https" })}>
                  <option value="rtsp">RTSP</option>
                  <option value="https">HTTPS</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section
            icon={<IcRadio className="h-4 w-4" />}
            title="MUMBLE · АУДИОСЕРВЕР"
            note="голосовые каналы «Допросная» и «Наблюдатели»"
            tone="text-amber"
          >
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <Field label="АДРЕС СЕРВЕРА">
                <input className={inp} value={form.mumble.host} onChange={(e) => setMu({ host: e.target.value })} placeholder="10.77.2.15" />
              </Field>
              <Field label="ПОРТ (UDP)">
                <input
                  className={inp}
                  type="number"
                  value={form.mumble.port}
                  onChange={(e) => setMu({ port: Number(e.target.value) || 64738 })}
                />
              </Field>
            </div>
            <p className="mt-2 truncate font-mono text-[10px] text-faint">
              строка подключения: mumble://{form.mumble.host || "…"}:{form.mumble.port}
            </p>
          </Section>

          <Section
            icon={<IcFile className="h-4 w-4" />}
            title="ONLYOFFICE DOCS"
            note="сервер совместного редактирования протоколов"
            tone="text-live"
          >
            <div className="space-y-2">
              <Field label="АДРЕС DOCUMENT SERVER">
                <input className={inp} value={form.onlyoffice.dsUrl} onChange={(e) => setOo({ dsUrl: e.target.value })} placeholder="https://docs.rt-cloud.local" />
              </Field>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Field label="JWT-СЕКРЕТ (ОПЦИОНАЛЬНО)">
                  <input className={inp} value={form.onlyoffice.jwt} onChange={(e) => setOo({ jwt: e.target.value })} placeholder="секрет подписи токена" />
                </Field>
                <Field label="URL ДОКУМЕНТА (ХРАНИЛИЩЕ)">
                  <input className={inp} value={form.onlyoffice.docUrl} onChange={(e) => setOo({ docUrl: e.target.value })} placeholder="https://…/protokol.docx" />
                </Field>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={checkOo}
                  disabled={ooStatus === "checking"}
                  className="flex h-8 items-center gap-1.5 rounded-md border border-live/50 bg-live/10 px-3 font-mono text-[10px] tracking-widest text-live transition-all hover:bg-live/20 active:scale-95 disabled:opacity-50"
                >
                  <IcSignal className="h-3.5 w-3.5" />
                  {ooStatus === "checking" ? "ПРОВЕРКА…" : "ПРОВЕРИТЬ ДОСТУП"}
                </button>
                {ooStatus === "ok" && (
                  <span className="font-mono text-[10px] text-live">✓ api.js доступен — DocsAPI найден</span>
                )}
                {ooStatus === "fail" && (
                  <span className="font-mono text-[10px] text-rec">✗ сервер недоступен или api.js не отвечает</span>
                )}
              </div>
            </div>
          </Section>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-line bg-panel2/50 px-4 py-3">
          <button
            onClick={() => {
              resetAll();
              setForm(JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as ServerConfig);
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
