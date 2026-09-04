import { useState } from "react";
import { ROOMS } from "../lib/data";
import { useStore } from "../lib/store";
import { RtMark, IcShield, IcCam, IcRadio, IcFile, IcSignal } from "./Icons";

const SOURCES = [
  { icon: IcCam, label: "MACROSCOP · видеостена", note: "3 потока / комната", tone: "text-hud" },
  { icon: IcRadio, label: "Mumble · аудиоканал", note: "PTT «Допросная»", tone: "text-amber" },
  { icon: IcFile, label: "ONLYOFFICE Docs", note: "сопротокол · RT-облако", tone: "text-live" },
];

export function LoginScreen() {
  const { users, login } = useStore();
  const [sel, setSel] = useState<string | null>(null);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);

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
              Ростелеком
            </div>
            <div className="mt-1.5 font-mono text-[10px] tracking-[0.3em] text-dim">
              ВИДЕОНАБЛЮДЕНИЕ · СИЗО-1
            </div>
          </div>
        </div>

        <div className="rt-stripe relative mx-10 mt-7" />

        {/* живые источники */}
        <div className="relative mx-10 mt-8 space-y-2.5">
          {SOURCES.map((s, i) => (
            <div
              key={s.label}
              className="rise flex items-center gap-3.5 rounded-lg border border-line bg-panel2/70 px-4 py-3"
              style={{ animationDelay: `${i * 110}ms` }}
            >
              <s.icon className={`h-5 w-5 ${s.tone}`} />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-fg">{s.label}</div>
                <div className="font-mono text-[10px] text-faint">{s.note}</div>
              </div>
              <span className="led ml-auto bg-live shadow-[0_0_7px_rgba(49,217,138,0.9)]" />
            </div>
          ))}
        </div>

        {/* мини-стена камер */}
        <div className="relative mx-10 mt-8 grid flex-1 grid-cols-3 gap-2.5">
          {ROOMS[1].cameras.map((c, i) => (
            <div key={c.id} className="relative min-h-[90px] overflow-hidden rounded-lg border border-line">
              <img src={c.src} alt="" className={`absolute inset-0 h-full w-full object-cover ${c.kb}`} />
              <div className="scanlines absolute inset-0" />
              <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-sm bg-black/50 px-1.5 py-0.5">
                <span className="led blink-rec h-1.5 w-1.5 bg-rec" style={{ animationDelay: `${i * 0.3}s` }} />
                <span className="font-mono text-[8.5px] tracking-widest text-fg">{c.num}</span>
              </div>
              <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 font-mono text-[8px] tracking-wider text-live">
                <IcSignal className="h-2.5 w-2.5" /> LIVE
              </span>
            </div>
          ))}
        </div>

        <div className="relative flex items-center justify-between px-10 py-6 font-mono text-[9.5px] tracking-wider text-faint">
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
            <span className="font-display text-lg font-extrabold uppercase tracking-wide">Ростелеком</span>
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
                    {u.name.replace(/^(майор|капитан|ст\. л-т)\s+/i, "").slice(0, 2).toUpperCase()}
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
