import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { probeAll } from "../lib/probe";
import { RtMark, IcShield, IcCam, IcRadio, IcFile, IcDb, IcRefresh } from "./Icons";

type ServerKey = "macroscop" | "mumble" | "onlyoffice" | "pg";
type St = "checking" | "online" | "offline";

const strip = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/+$/, "");

export function LoginScreen() {
  const { users, login, config } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);

  /* ── цели опроса четырёх серверов ── */
  const targets = useMemo(
    () => [
      {
        key: "macroscop" as ServerKey,
        icon: IcCam,
        tone: "text-hud",
        glow: "rgba(0,176,240,0.28)",
        name: "MACROSCOP",
        sub: `видеостена · ${strip(config.macroscop.host)}`,
        url: "http://localhost:8888/v3/paths/list",
        cors: false,
      },
      {
        key: "mumble" as ServerKey,
        icon: IcRadio,
        tone: "text-amber",
        glow: "rgba(255,138,61,0.28)",
        name: "MUMBLE",
        sub: `аудиоканал · ${config.mumble.host}:${config.mumble.port}`,
        url: config.mumble.webUrl,
        cors: false,
      },
      {
        key: "onlyoffice" as ServerKey,
        icon: IcFile,
        tone: "text-live",
        glow: "rgba(49,217,138,0.28)",
        name: "ONLYOFFICE",
        sub: `документы · ${strip(config.onlyoffice.dsUrl)}`,
        url: `${config.onlyoffice.dsUrl.replace(/\/+$/, "")}/healthcheck`,
        cors: false,
      },
      {
        key: "pg" as ServerKey,
        icon: IcDb,
        tone: "text-violet",
        glow: "rgba(122,92,245,0.3)",
        name: "POSTGRESQL",
        sub: `данные · ${strip(config.backend.apiUrl)}`,
        url: `${config.backend.apiUrl.replace(/\/+$/, "")}/users?select=id&limit=1`,
        cors: true,
      },
    ],
    [config],
  );

  const [status, setStatus] = useState<Record<ServerKey, { st: St; ms: number | null }>>(() =>
    Object.fromEntries(targets.map((t) => [t.key, { st: "checking", ms: null }])) as Record<
      ServerKey,
      { st: St; ms: number | null }
    >,
  );
  const [busy, setBusy] = useState(false);

  const run = useCallback(() => {
    setBusy(true);
    setStatus(
      Object.fromEntries(targets.map((t) => [t.key, { st: "checking", ms: null }])) as Record<
        ServerKey,
        { st: St; ms: number | null }
      >,
    );
    probeAll(targets, (key, r) => {
      setStatus((prev) => ({
        ...prev,
        [key]: { st: r.online ? "online" : "offline", ms: r.latencyMs },
      }));
    }).finally(() => setBusy(false));
  }, [targets]);

  useEffect(() => {
    run();
  }, [run]);

  const onlineCount = targets.filter((t) => status[t.key]?.st === "online").length;

  const submit = () => {
    if (!sel) {
      setErr(true);
      window.setTimeout(() => setErr(false), 500);
      return;
    }
    login(sel);
  };

  const selUser = users.find((u) => u.id === sel) ?? null;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ── левая брендовая панель ── */}
      <aside className="relative hidden overflow-hidden border-r border-line bg-panel/60 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 opacity-[0.35]">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet/20 blur-3xl" />
          <div className="absolute -bottom-28 right-0 h-96 w-96 rounded-full bg-hud/15 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3.5 px-10 pt-10">
          <RtMark className="h-12 w-12" />
          <div>
            <div className="font-display text-[22px] font-extrabold uppercase leading-none tracking-[0.08em] text-fg">
              СКИТ
            </div>
            <div className="mt-1.5 font-mono text-[10px] tracking-[0.3em] text-dim">
              ДОПРОСНАЯ
            </div>
          </div>
        </div>

        <div className="rt-stripe relative mx-10 mt-7" />

        {/* ── живой статус сервисов ── */}
        <div className="relative mx-10 mt-8 flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="font-display text-[11px] tracking-[0.22em] text-dim">СТАТУС СЕРВИСОВ</span>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[9.5px] tabular-nums transition-colors ${
                onlineCount === targets.length
                  ? "border-live/50 bg-live/10 text-live"
                  : onlineCount === 0
                    ? "border-rec/50 bg-rec/10 text-rec"
                    : "border-amber/50 bg-amber/10 text-amber"
              }`}
            >
              {onlineCount}/{targets.length}
            </span>
            <button
              onClick={run}
              disabled={busy}
              title="Повторить опрос серверов"
              className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-line bg-panel2 text-dim transition-all hover:border-hud/60 hover:text-hud active:scale-90 disabled:opacity-50"
            >
              <IcRefresh className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="space-y-2.5">
            {targets.map((t, i) => {
              const s = status[t.key] ?? { st: "checking" as St, ms: null };
              return (
                <div
                  key={t.key}
                  className="rise group relative flex items-center gap-3.5 overflow-hidden rounded-lg border border-line bg-panel2/70 px-4 py-3 transition-all duration-200 hover:border-line2"
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  {/* цветовая кромка слева при онлайне */}
                  <span
                    className={`absolute inset-y-0 left-0 w-[3px] transition-opacity duration-300 ${
                      s.st === "online" ? "opacity-100" : "opacity-0"
                    }`}
                    style={{ background: t.glow.replace("0.28", "1").replace("0.3", "1") }}
                  />
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-panel transition-shadow duration-300 ${t.tone}`}
                    style={s.st === "online" ? { boxShadow: `0 0 14px ${t.glow}` } : undefined}
                  >
                    <t.icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className={`truncate font-display text-[11px] tracking-[0.16em] ${s.st === "offline" ? "text-faint" : "text-fg"}`}>
                      {t.name}
                    </div>
                    <div className="truncate font-mono text-[9.5px] tracking-wider text-faint">{t.sub}</div>
                  </div>

                  {/* индикатор состояния */}
                  <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
                    {s.st === "checking" && (
                      <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-amber">
                        <span className="led blink-rec bg-amber shadow-[0_0_7px_rgba(255,138,61,0.9)]" />
                        ОПРОС…
                      </span>
                    )}
                    {s.st === "online" && (
                      <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-live">
                        <span className="led bg-live shadow-[0_0_7px_rgba(49,217,138,0.9)]" />
                        ОНЛАЙН
                      </span>
                    )}
                    {s.st === "offline" && (
                      <span className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-rec">
                        <span className="led bg-rec shadow-[0_0_7px_rgba(255,77,94,0.9)]" />
                        ОФЛАЙН
                      </span>
                    )}
                    <span className="font-mono text-[8.5px] tabular-nums text-faint">
                      {s.st === "online" && s.ms !== null ? `${s.ms} мс` : s.st === "offline" ? "нет ответа" : "…"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-auto pb-2 pt-4 font-mono text-[8.5px] leading-relaxed tracking-wider text-faint">
            опрос выполняется из браузера · видеопоток проверяется через MediaMTX ·
            PostgreSQL — через PostgREST
          </p>
        </div>

        <div className="relative flex items-center justify-between px-10 py-5 font-mono text-[9.5px] tracking-wider text-faint">
          <span>пульт наблюдения · пост 7 · смена Б</span>
          <span>канал защищён · ФСТЭК-Б</span>
        </div>
        <div className="rt-stripe" />
      </aside>

      {/* ── форма входа ── */}
      <main className={`flex items-center justify-center p-5 ${err ? "shake" : ""}`}>
        <div className="rise w-full max-w-[520px]">
          <div className="mb-5 flex items-center gap-3 lg:hidden">
            <RtMark className="h-9 w-9" />
            <span className="font-display text-lg font-extrabold uppercase tracking-wide">СКИТ</span>
          </div>

          <h1 className="font-display text-[24px] font-extrabold uppercase leading-tight tracking-wide text-fg">
            Вход в <span className="rt-grad-text">пульт наблюдения</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-dim">
            Выберите учётную запись. Администратору доступны настройки серверов и управление доступом.
          </p>

          {/* список учётных записей */}
          <div className="mt-5 max-h-[300px] space-y-1.5 overflow-y-auto rounded-xl border border-line bg-panel/70 p-2">
            {users.map((u) => {
              const active = sel === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setSel(u.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                    active
                      ? "border-hud/70 bg-hud/10 shadow-[0_0_16px_rgba(0,176,240,0.15)]"
                      : "border-transparent hover:border-line hover:bg-panel2/70"
                  }`}
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-display text-[11px] font-bold text-ink"
                    style={{ background: u.color }}
                  >
                    {u.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-fg">{u.name}</span>
                    <span className="block truncate font-mono text-[10px] text-faint">{u.title}</span>
                  </span>
                  {u.isAdmin && (
                    <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-violet/50 bg-violet/15 px-2 py-0.5 font-mono text-[9px] tracking-wider text-violet">
                      <IcShield className="h-3 w-3" /> АДМИН
                    </span>
                  )}
                  {active && !u.isAdmin && (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-hud shadow-[0_0_8px_rgba(0,176,240,0.9)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* пароль */}
          <label className="mt-4 block">
            <span className="mb-1.5 block font-mono text-[10px] tracking-[0.22em] text-faint">ПАРОЛЬ</span>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="любой пароль · демонстрационный режим"
              className="h-11 w-full rounded-lg border border-line bg-panel2 px-3.5 font-mono text-[13px] text-fg outline-none transition-all placeholder:text-faint focus:border-hud/70 focus:shadow-[0_0_0_3px_rgba(0,176,240,0.12)]"
            />
          </label>

          <button
            onClick={submit}
            disabled={!sel}
            className="rt-grad-bg mt-4 flex h-12 w-full items-center justify-center gap-2.5 rounded-lg font-display text-[13px] font-bold tracking-[0.2em] text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35 disabled:saturate-50"
          >
            ВОЙТИ В СИСТЕМУ
            {selUser && <span className="font-mono text-[10px] font-normal opacity-80">· {selUser.name}</span>}
          </button>

          <p className="mt-3 text-center font-mono text-[9.5px] leading-relaxed tracking-wide text-faint">
            демо-среда · права и настройки серверов сохраняются локально · сброс — через админ-панель
          </p>
        </div>
      </main>
    </div>
  );
}
