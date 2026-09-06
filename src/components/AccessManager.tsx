import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ROOMS } from "../lib/data";
import { useStore } from "../lib/store";
import { IcUsers, IcClose, IcEye, IcPen, IcShield } from "./Icons";

interface Props {
  onClose: () => void;
  onToast: (s: string) => void;
}

export function AccessManager({ onClose, onToast }: Props) {
  const { users, me, patchUser } = useStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleIn = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const setView = (userId: string, roomId: string, on: boolean) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    const view = toggleIn(u.view, roomId);
    /* если забираем просмотр комнаты — забираем и редактирование */
    const edit = on ? u.edit : u.edit.filter((r) => r !== roomId);
    patchUser(userId, { view, edit });
    const who = u.name;
    const room = ROOMS.find((r) => r.id === roomId);
    onToast(on ? `${who}: разрешён просмотр «${room?.name}»` : `${who}: доступ к «${room?.name}» закрыт`);
  };

  const setEdit = (userId: string, roomId: string, on: boolean) => {
    const u = users.find((x) => x.id === userId);
    if (!u) return;
    /* право редактирования подразумевает и просмотр */
    const view = on && !u.view.includes(roomId) ? [...u.view, roomId] : u.view;
    patchUser(userId, { view, edit: toggleIn(u.edit, roomId) });
    const who = u.name;
    const room = ROOMS.find((r) => r.id === roomId);
    onToast(
      on
        ? `${who}: разрешено редактирование протокола «${room?.name}»`
        : `${who}: только чтение протокола «${room?.name}»`,
    );
  };

  const setAdmin = (userId: string, on: boolean) => {
    const ok = patchUser(userId, { isAdmin: on });
    if (!ok) {
      onToast("Нельзя снять права у последнего администратора");
      return;
    }
    const u = users.find((x) => x.id === userId);
    onToast(on ? `${u?.name}: назначен администратором` : `${u?.name}: права администратора сняты`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[3px]" onClick={onClose} />
      <div className="rise relative flex max-h-full w-full max-w-[780px] flex-col overflow-hidden rounded-xl border border-line2 bg-panel shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
        <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line bg-panel2/70 px-4">
          <IcUsers className="h-4.5 w-4.5 text-hud" />
          <h2 className="font-display text-[12px] tracking-[0.18em] text-fg">УПРАВЛЕНИЕ ДОСТУПОМ</h2>
          <span className="hidden font-mono text-[9.5px] text-faint sm:block">комнаты · просмотр · ONLYOFFICE</span>
          <button
            onClick={onClose}
            title="Закрыть (ESC)"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md border border-line bg-panel text-dim transition-all hover:border-rec/60 hover:text-rec active:scale-95"
          >
            <IcClose className="h-4 w-4" />
          </button>
        </header>
        <div className="rt-stripe" />

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <table className="w-full border-separate border-spacing-y-1">
            <thead>
              <tr className="font-mono text-[9px] tracking-[0.18em] text-faint">
                <th className="px-2 py-1.5 text-left font-medium">УЧАСТНИК</th>
                <th className="px-1 py-1.5 text-center font-medium" title="Права администратора">
                  <IcShield className="mx-auto h-3.5 w-3.5 text-violet" />
                </th>
                {ROOMS.map((r) => (
                  <th key={r.id} className="px-1 py-1.5 text-center font-medium">
                    <div className="text-hud">{r.code}</div>
                    <div className="mt-0.5 max-w-[92px] truncate text-[8px] normal-case tracking-wider">{r.name}</div>
                    <div className="mt-1 flex items-center justify-center gap-2.5">
                      <span title="Просмотр комнаты (видео)"><IcEye className="h-3 w-3" /></span>
                      <span title="Редактирование протокола в ONLYOFFICE"><IcPen className="h-3 w-3" /></span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = me?.id === u.id;
                return (
                  <tr key={u.id} className="group">
                    <td className="rounded-l-lg border border-line bg-panel2/60 px-2.5 py-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[10px] font-bold text-ink"
                          style={{ background: u.color }}
                        >
                          {u.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-fg">
                            {u.name}
                            {isMe && <span className="ml-1.5 font-mono text-[9px] text-hud">(вы)</span>}
                          </div>
                          <div className="truncate font-mono text-[9px] text-faint">{u.title}</div>
                        </div>
                      </div>
                    </td>

                    <td className="border-y border-line bg-panel2/60 px-1 text-center">
                      <button
                        onClick={() => setAdmin(u.id, !u.isAdmin)}
                        title={u.isAdmin ? "Снять права администратора" : "Назначить администратором"}
                        className={`mx-auto grid h-7 w-7 place-items-center rounded-md border transition-all active:scale-90 ${
                          u.isAdmin
                            ? "border-violet/70 bg-violet/20 text-violet shadow-[0_0_12px_rgba(122,92,245,0.3)]"
                            : "border-line bg-panel text-faint hover:border-line2 hover:text-dim"
                        }`}
                      >
                        <IcShield className="h-3.5 w-3.5" />
                      </button>
                    </td>

                    {ROOMS.map((r, ri) => {
                      const canView = u.isAdmin || u.view.includes(r.id);
                      const canEdit = u.isAdmin || u.edit.includes(r.id);
                      const last = ri === ROOMS.length - 1;
                      return (
                        <td
                          key={r.id}
                          className={`border-y border-line bg-panel2/60 px-1 text-center ${last ? "rounded-r-lg border-r" : ""}`}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => !u.isAdmin && setView(u.id, r.id, !canView)}
                              disabled={u.isAdmin}
                              title={u.isAdmin ? "Администратор видит все комнаты" : canView ? "Запретить просмотр" : "Разрешить просмотр"}
                              className={`grid h-7 w-7 place-items-center rounded-md border transition-all active:scale-90 disabled:cursor-default ${
                                canView
                                  ? "border-hud/70 bg-hud/15 text-hud shadow-[0_0_10px_rgba(0,176,240,0.25)]"
                                  : "border-line bg-panel text-faint hover:border-line2 hover:text-dim"
                              }`}
                            >
                              <IcEye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => !u.isAdmin && setEdit(u.id, r.id, !canEdit)}
                              disabled={u.isAdmin}
                              title={u.isAdmin ? "Администратор редактирует везде" : canEdit ? "Оставить только чтение" : "Разрешить редактирование"}
                              className={`grid h-7 w-7 place-items-center rounded-md border transition-all active:scale-90 disabled:cursor-default ${
                                canEdit
                                  ? "border-live/70 bg-live/15 text-live shadow-[0_0_10px_rgba(49,217,138,0.25)]"
                                  : "border-line bg-panel text-faint hover:border-line2 hover:text-dim"
                              }`}
                            >
                              <IcPen className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-2 font-mono text-[9px] tracking-wider text-faint">
            <span className="flex items-center gap-1.5"><IcEye className="h-3 w-3 text-hud" /> просмотр комнаты (видеостена + аудио)</span>
            <span className="flex items-center gap-1.5"><IcPen className="h-3 w-3 text-live" /> совместное редактирование протокола</span>
            <span className="flex items-center gap-1.5"><IcShield className="h-3 w-3 text-violet" /> администратор: серверы + доступы</span>
          </p>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-panel2/50 px-4 py-3">
          <span className="font-mono text-[9.5px] text-faint">изменения применяются сразу и сохраняются</span>
          <button
            onClick={onClose}
            className="rt-grad-bg flex h-9 items-center rounded-md px-4 font-display text-[10.5px] tracking-[0.18em] text-white transition-all hover:brightness-110 active:scale-95"
          >
            ГОТОВО
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
