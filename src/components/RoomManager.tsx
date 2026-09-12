import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CAM_PRESETS, DEFAULT_ROOMS, makeCamera, type CameraDef, type RoomDef } from "../lib/data";
import { useStore } from "../lib/store";
import { IcRooms, IcClose, IcPlus, IcTrash, IcCam } from "./Icons";

interface Props {
  onClose: () => void;
  onToast: (s: string) => void;
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

export function RoomManager({ onClose, onToast }: Props) {
  const { rooms, addRoom, updateRoom, deleteRoom } = useStore();
  const [activeId, setActiveId] = useState(rooms[0]?.id);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ code: "", name: "", mumbleChannel: "", docTitle: "" });
  const [camPreset, setCamPreset] = useState(CAM_PRESETS[0].id);

  const active: RoomDef | undefined = rooms.find((r) => r.id === activeId) ?? rooms[0];
  const isDefault = active?.id === DEFAULT_ROOMS[0].id;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const createRoom = () => {
    const code = newForm.code.trim() || `Д-${String(rooms.length + 1).padStart(2, "0")}`;
    const name = newForm.name.trim() || `Допросная №${rooms.length + 1}`;
    const r = addRoom({
      code,
      name,
      mumbleChannel: newForm.mumbleChannel.trim() || name,
      docTitle: newForm.docTitle.trim() || `Протокол — ${name}`,
      docKey: `${code.toLowerCase()}-${Date.now().toString(36)}`,
      cameras: [makeCamera("A", 1), makeCamera("B", 2)],
    });
    setActiveId(r.id);
    setNewOpen(false);
    setNewForm({ code: "", name: "", mumbleChannel: "", docTitle: "" });
    onToast(`Комната «${r.code} · ${r.name}» добавлена. Назначьте права в «Доступе».`);
  };

  const removeRoom = () => {
    if (!active || isDefault) return;
    const code = active.code;
    deleteRoom(active.id);
    setActiveId(rooms.find((r) => r.id !== active.id)?.id ?? DEFAULT_ROOMS[0].id);
    onToast(`Комната «${code}» удалена`);
  };

  const setCam = (camId: string, patch: Partial<CameraDef>) => {
    if (!active) return;
    updateRoom(active.id, {
      cameras: active.cameras.map((c) => (c.id === camId ? { ...c, ...patch } : c)),
    });
  };

  const addCam = () => {
    if (!active) return;
    updateRoom(active.id, { cameras: [...active.cameras, makeCamera(camPreset, active.cameras.length + 1)] });
  };

  const delCam = (camId: string) => {
    if (!active) return;
    updateRoom(active.id, { cameras: active.cameras.filter((c) => c.id !== camId) });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" onClick={onClose} />
      <div className="rise relative flex max-h-full w-full max-w-[880px] flex-col overflow-hidden rounded-rt-l border border-line2 bg-panel shadow-rt-4">
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-panel2/70 px-4">
          <IcRooms className="h-4.5 w-4.5 text-hud" />
          <h2 className="font-display text-[12px] tracking-[0.18em] text-fg">УПРАВЛЕНИЕ КОМНАТАМИ</h2>
          <span className="hidden font-mono text-[9.5px] text-faint sm:block">названия · камеры · только для администратора</span>
          <button
            onClick={onClose}
            title="Закрыть (ESC)"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-dim transition-all hover:border-rec/60 hover:text-rec active:scale-95"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </header>
        <div className="rt-stripe" />

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[240px_1fr]">
          {/* список комнат */}
          <aside className="flex min-h-0 flex-col border-b border-line bg-panel2/40 md:border-b-0 md:border-r">
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
              {rooms.map((r) => {
                const sel = active?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveId(r.id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all duration-150 ${
                      sel ? "border-hud/70 bg-hud/10 shadow-[0_0_16px_rgba(0,176,240,0.15)]" : "border-line bg-panel2/60 hover:border-line2"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-panel px-1.5 py-0.5 font-mono text-[10px] font-semibold text-hud">{r.code}</span>
                      <span className="truncate text-[12.5px] font-semibold text-fg">{r.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-faint">
                      <IcCam className="h-3 w-3" /> {r.cameras.length} кам. · {r.mumbleChannel}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="shrink-0 p-3">
              <button
                onClick={() => setNewOpen((v) => !v)}
                className="rt-grad-bg flex h-9 w-full items-center justify-center gap-2 rounded-lg font-display text-[11px] tracking-[0.16em] text-white transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <IcPlus className="h-3.5 w-3.5" /> НОВАЯ КОМНАТА
              </button>
            </div>
          </aside>

          {/* редактор комнаты */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            {newOpen && (
              <div className="mb-4 rounded-lg border border-live/40 bg-live/5 p-3.5">
                <div className="mb-2.5 font-display text-[10.5px] tracking-[0.16em] text-live">ДОБАВЛЕНИЕ КОМНАТЫ</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="КОД" w="col-span-1">
                    <input className={inp} value={newForm.code} onChange={(e) => setNewForm((f) => ({ ...f, code: e.target.value }))} placeholder="Д-02" />
                  </Field>
                  <Field label="НАЗВАНИЕ" w="col-span-1">
                    <input className={inp} value={newForm.name} onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))} placeholder="Допросная №2" />
                  </Field>
                  <Field label="MUMBLE-КАНАЛ" w="col-span-1">
                    <input className={inp} value={newForm.mumbleChannel} onChange={(e) => setNewForm((f) => ({ ...f, mumbleChannel: e.target.value }))} placeholder="Допросная №2" />
                  </Field>
                  <Field label="ЗАГОЛОВОК ПРОТОКОЛА" w="col-span-1">
                    <input className={inp} value={newForm.docTitle} onChange={(e) => setNewForm((f) => ({ ...f, docTitle: e.target.value }))} placeholder="Протокол — …" />
                  </Field>
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={createRoom} className="rt-grad-bg flex h-8 items-center rounded-md px-3.5 font-display text-[10px] tracking-[0.16em] text-white hover:brightness-110 active:scale-95">
                    СОЗДАТЬ
                  </button>
                  <button onClick={() => setNewOpen(false)} className="flex h-8 items-center rounded-md border border-line bg-panel px-3 font-mono text-[10px] tracking-widest text-dim hover:border-line2 hover:text-fg active:scale-95">
                    ОТМЕНА
                  </button>
                </div>
              </div>
            )}

            {active && (
              <>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="rounded-md bg-hud/15 px-2 py-1 font-mono text-[12px] font-bold text-hud">{active.code}</span>
                  <span className="font-display text-[14px] tracking-wide text-fg">{active.name}</span>
                  {!isDefault && (
                    <button
                      onClick={removeRoom}
                      title="Удалить комнату"
                      className="ml-auto flex items-center gap-1.5 rounded-md border border-rec/40 bg-rec/10 px-2.5 py-1.5 font-mono text-[9.5px] tracking-widest text-rec transition-all hover:bg-rec/20 active:scale-95"
                    >
                      <IcTrash className="h-3.5 w-3.5" /> УДАЛИТЬ
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="КОД"><input className={inp} value={active.code} onChange={(e) => updateRoom(active.id, { code: e.target.value })} /></Field>
                  <Field label="НАЗВАНИЕ"><input className={inp} value={active.name} onChange={(e) => updateRoom(active.id, { name: e.target.value })} /></Field>
                  <Field label="MUMBLE-КАНАЛ"><input className={inp} value={active.mumbleChannel} onChange={(e) => updateRoom(active.id, { mumbleChannel: e.target.value })} /></Field>
                  <Field label="ЗАГОЛОВОК ПРОТОКОЛА"><input className={inp} value={active.docTitle} onChange={(e) => updateRoom(active.id, { docTitle: e.target.value })} /></Field>
                </div>

                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-display text-[10.5px] tracking-[0.16em] text-dim">КАМЕРЫ КОМНАТЫ</span>
                    <span className="rounded-full bg-panel2 px-2 py-0.5 font-mono text-[9px] text-faint">{active.cameras.length}</span>
                  </div>

                  <div className="space-y-2">
                    {active.cameras.map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel2/50 p-2.5">
                        <img src={c.src} alt="" className="h-11 w-16 shrink-0 rounded-md border border-line object-cover" />
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 md:grid-cols-[70px_1fr]">
                          <input className={inp} value={c.num} onChange={(e) => setCam(c.id, { num: e.target.value })} title="Номер камеры" />
                          <input className={inp} value={c.label} onChange={(e) => setCam(c.id, { label: e.target.value })} title="Назначение" />
                        </div>
                        <button
                          onClick={() => delCam(c.id)}
                          title="Убрать камеру"
                          className="grid h-8 w-8 place-items-center rounded-md border border-line bg-panel text-faint transition-all hover:border-rec/50 hover:text-rec active:scale-90"
                        >
                          <IcTrash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[9px] tracking-[0.18em] text-faint">КАДР:</span>
                    {CAM_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setCamPreset(p.id)}
                        title={p.label}
                        className={`overflow-hidden rounded-md border-2 transition-all active:scale-95 ${camPreset === p.id ? "border-hud shadow-[0_0_12px_rgba(0,176,240,0.35)]" : "border-line opacity-60 hover:opacity-100"}`}
                      >
                        <img src={p.src} alt={p.label} className="h-9 w-14 object-cover" />
                      </button>
                    ))}
                    <button
                      onClick={addCam}
                      className="ml-auto flex h-8 items-center gap-1.5 rounded-md border border-live/50 bg-live/10 px-3 font-mono text-[10px] tracking-widest text-live transition-all hover:bg-live/20 active:scale-95"
                    >
                      <IcPlus className="h-3.5 w-3.5" /> ДОБАВИТЬ КАМЕРУ
                    </button>
                  </div>
                </div>

                <p className="mt-4 font-mono text-[9px] leading-relaxed tracking-wide text-faint">
                  Права пользователей на просмотр камер этой комнаты назначаются в панели «Доступ»
                  (матрица «участник × комната»). Изменения применяются сразу и сохраняются в БД.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
