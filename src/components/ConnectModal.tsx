import { useState } from "react";
import { createPortal } from "react-dom";
import {
  loadDocsApi,
  apiScriptUrl,
  OO_LS_SERVER,
  OO_LS_JWT,
  OO_LS_DOCURL,
  OO_LS_TITLE,
} from "../lib/onlyoffice";
import { IcClose, IcSignal } from "./Icons";

export interface OOSettings {
  server: string;
  jwt: string;
  docUrl: string;
  title: string;
}

export function loadSettings(): OOSettings {
  const g = (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  };
  return {
    server: g(OO_LS_SERVER, ""),
    jwt: g(OO_LS_JWT, ""),
    docUrl: g(OO_LS_DOCURL, ""),
    title: g(OO_LS_TITLE, "Протокол наблюдения.docx"),
  };
}

export function saveSettings(s: OOSettings): void {
  try {
    localStorage.setItem(OO_LS_SERVER, s.server);
    localStorage.setItem(OO_LS_JWT, s.jwt);
    localStorage.setItem(OO_LS_DOCURL, s.docUrl);
    localStorage.setItem(OO_LS_TITLE, s.title);
  } catch {
    /* ignore */
  }
}

interface Props {
  initial: OOSettings;
  onClose: () => void;
  onConnect: (s: OOSettings) => void;
  onOffline: () => void;
}

export function ConnectModal({ initial, onClose, onConnect, onOffline }: Props) {
  const [form, setForm] = useState<OOSettings>(initial);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (k: keyof OOSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const test = async () => {
    if (!form.server.trim()) {
      setTestResult({ ok: false, text: "Укажите адрес Document Server" });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await loadDocsApi(form.server.trim());
      setTestResult({ ok: true, text: "DocsAPI доступен — сервер готов к работе" });
    } catch (e) {
      setTestResult({
        ok: false,
        text: e instanceof Error ? e.message : "Сервер недоступен",
      });
    } finally {
      setTesting(false);
    }
  };

  const field =
    "w-full rounded-md border border-line bg-ink/60 px-3 py-2 font-mono text-[11.5px] text-fg placeholder:text-faint focus:border-hud/60 focus:outline-none";
  const label = "mb-1 block font-mono text-[9.5px] tracking-[0.16em] text-faint";

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className="rise relative w-full max-w-lg rounded-xl border border-line2 bg-panel shadow-2xl">
        <div className="rt-stripe absolute inset-x-0 top-0 rounded-t-xl" />
        <header className="flex h-12 items-center gap-2.5 border-b border-line px-4">
          <IcSignal className="h-4 w-4 text-hud" />
          <h3 className="font-display text-[12.5px] tracking-[0.14em] text-fg">
            ПОДКЛЮЧЕНИЕ К ONLYOFFICE DOCS
          </h3>
          <button
            onClick={onClose}
            className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-line bg-panel2 text-dim transition-all hover:border-rec/60 hover:text-rec"
          >
            <IcClose className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-3.5 p-4">
          <div>
            <label className={label}>АДРЕС DOCUMENT SERVER</label>
            <input
              className={field}
              value={form.server}
              onChange={set("server")}
              placeholder="https://docserver.example.ru"
              spellCheck={false}
            />
            {form.server.trim() && (
              <p className="mt-1 truncate font-mono text-[9px] text-faint">
                api.js → {apiScriptUrl(form.server.trim())}
              </p>
            )}
          </div>

          <div>
            <label className={label}>JWT-СЕКРЕТ (ЕСЛИ ВКЛЮЧЕНА ПОДПИСЬ)</label>
            <input
              className={field}
              type="password"
              value={form.jwt}
              onChange={set("jwt")}
              placeholder="••••••••••••"
              spellCheck={false}
            />
          </div>

          <div>
            <label className={label}>URL ДОКУМЕНТА (ДОСТУПЕН СЕРВЕРУ)</label>
            <input
              className={field}
              value={form.docUrl}
              onChange={set("docUrl")}
              placeholder="https://storage.example.ru/protokol.docx"
              spellCheck={false}
            />
          </div>

          <div>
            <label className={label}>НАЗВАНИЕ ДОКУМЕНТА</label>
            <input
              className={field}
              value={form.title}
              onChange={set("title")}
              placeholder="Протокол наблюдения.docx"
              spellCheck={false}
            />
          </div>

          {testResult && (
            <div
              className={`rounded-md border px-3 py-2 font-mono text-[10.5px] ${
                testResult.ok
                  ? "border-live/40 bg-live/10 text-live"
                  : "border-rec/40 bg-rec/10 text-rec"
              }`}
            >
              {testResult.text}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={test}
              disabled={testing}
              className="flex h-9 items-center gap-1.5 rounded-md border border-line2 bg-panel2 px-3 font-mono text-[10.5px] tracking-widest text-dim transition-all hover:border-hud/60 hover:text-hud active:scale-95 disabled:opacity-50"
            >
              <IcSignal className="h-3.5 w-3.5" />
              {testing ? "ПРОВЕРКА…" : "ПРОВЕРИТЬ"}
            </button>
            <button
              onClick={() => {
                saveSettings(form);
                onConnect(form);
              }}
              disabled={!form.server.trim()}
              className="rt-grad-bg ml-auto flex h-9 items-center rounded-md px-4 font-display text-[11px] tracking-[0.14em] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              ПОДКЛЮЧИТЬСЯ
            </button>
          </div>

          <button
            onClick={onOffline}
            className="w-full rounded-md border border-line bg-panel2/60 px-3 py-2 font-mono text-[10px] tracking-wider text-faint transition-all hover:border-line2 hover:text-dim"
          >
            ОСТАТЬСЯ В ОФЛАЙН-РЕЖИМЕ (СОВМЕСТНОЕ РЕДАКТИРОВАНИЕ БЕЗ СЕРВЕРА)
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
