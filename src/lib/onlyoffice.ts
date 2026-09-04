/* Интеграция с ONLYOFFICE Docs (Document Server) через официальный JS API.
   См.: https://api.onlyoffice.com/docs/docs-api/usage-api/ */

export interface OOUser {
  id: string;
  name: string;
}

export interface DocsEditorInstance {
  destroyEditor: () => void;
}

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (placeholderId: string, cfg: OOEditorConfig) => DocsEditorInstance;
    };
  }
}

export interface OOEditorConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
  };
  documentType: "text" | "spreadsheet" | "presentation";
  editorConfig: {
    callbackUrl?: string;
    lang: string;
    mode: "edit" | "view";
    user: OOUser;
    customization?: Record<string, unknown>;
  };
  events?: {
    onAppReady?: () => void;
    onDocumentStateChange?: (e: { data: boolean }) => void;
    onError?: (e: { data?: { errorCode?: number; errorDescription?: string } }) => void;
    onInfo?: (e: { data?: Record<string, unknown> }) => void;
  };
  token?: string;
  width?: string;
  height?: string;
}

export const OO_LS_SERVER = "doprosnaya2-oo-server";
export const OO_LS_JWT = "doprosnaya2-oo-jwt";
export const OO_LS_DOCURL = "doprosnaya2-oo-docurl";
export const OO_LS_TITLE = "doprosnaya2-oo-title";

export function apiScriptUrl(server: string): string {
  return `${server.replace(/\/+$/, "")}/web-apps/apps/api/documents/api.js`;
}

let pending: Promise<void> | null = null;
let pendingFor = "";

/** Загружает api.js с Document Server. Резолвится, когда доступен window.DocsAPI. */
export function loadDocsApi(server: string): Promise<void> {
  if (window.DocsAPI) return Promise.resolve();
  if (pending && pendingFor === server) return pending;

  pendingFor = server;
  pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = apiScriptUrl(server);
    script.async = true;

    const timer = window.setTimeout(() => {
      fail(new Error("Превышено время ожидания ответа сервера"));
    }, 7000);

    const fail = (err: Error) => {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      script.remove();
      pending = null;
      pendingFor = "";
      reject(err);
    };

    script.onload = () => {
      window.clearTimeout(timer);
      if (window.DocsAPI) resolve();
      else fail(new Error("Сервер ответил, но DocsAPI не найден"));
    };
    script.onerror = () => fail(new Error("Не удалось загрузить api.js — сервер недоступен"));

    document.head.appendChild(script);
  });
  return pending;
}

export function buildEditorConfig(opts: {
  title: string;
  docKey: string;
  docUrl: string;
  user: OOUser;
  callbackUrl?: string;
  token?: string;
  events?: OOEditorConfig["events"];
}): OOEditorConfig {
  return {
    document: {
      fileType: "docx",
      key: opts.docKey,
      title: opts.title,
      url: opts.docUrl,
    },
    documentType: "text",
    editorConfig: {
      callbackUrl: opts.callbackUrl,
      lang: "ru",
      mode: "edit",
      user: opts.user,
      customization: {
        autosave: true,
        forcesave: true,
        compactToolbar: false,
        uiTheme: "theme-dark",
      },
    },
    events: opts.events,
    token: opts.token || undefined,
    width: "100%",
    height: "100%",
  };
}

/** Уникальный ключ версии документа (меняется при каждом сохранении). */
export function makeDocKey(title: string): string {
  const base = title.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "_").slice(0, 24) || "doc";
  return `${base}_${Date.now().toString(36)}`;
}

export function downloadDocument(title: string, content: string): string {
  const blob = new Blob(["\ufeff" + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const name = `${title.replace(/\.[a-z0-9]+$/i, "")}_${stamp}.txt`;
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return name;
}
