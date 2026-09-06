import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_TEMPLATES,
  DEFAULT_USERS,
  LS_KEYS,
  ROOMS,
  docLsKey,
  renderTemplate,
  type RoomDef,
  type ServerConfig,
  type UserRec,
} from "./data";
import { log } from "./logger";
import { backend } from "./backend";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* приватный режим — молча */
  }
}

function mergeConfig(c: Partial<ServerConfig> | null): ServerConfig {
  if (!c) return DEFAULT_CONFIG;
  return {
    macroscop: { ...DEFAULT_CONFIG.macroscop, ...c.macroscop },
    mumble: { ...DEFAULT_CONFIG.mumble, ...c.mumble },
    onlyoffice: { ...DEFAULT_CONFIG.onlyoffice, ...c.onlyoffice },
    backend: { ...DEFAULT_CONFIG.backend, ...c.backend },
  };
}

export const mumbleUrlOf = (c: ServerConfig) => `mumble://${c.mumble.host}:${c.mumble.port}`;

interface StoreValue {
  config: ServerConfig;
  users: UserRec[];
  me: UserRec | null;
  roomId: string;
  room: RoomDef;
  myRooms: RoomDef[];
  login: (loginStr: string, password: string) => Promise<UserRec | null>;
  logout: () => void;
  createUser: (u: Omit<UserRec, "id">) => UserRec;
  deleteUser: (id: string) => boolean;
  setRoomId: (id: string) => void;
  saveConfig: (c: ServerConfig) => void;
  patchUser: (id: string, patch: Partial<UserRec>) => boolean;
  resetAll: () => void;
  templates: Record<string, string>;
  templateTick: number;
  getTemplate: (roomId: string) => string;
  saveTemplate: (roomId: string, text: string) => void;
  resetTemplate: (roomId: string) => void;
  applyTemplateToDoc: (roomId: string) => void;
  /** Гидрация состояний из PostgreSQL (при доступной БД). */
  hydrateFromDb: (u: UserRec[], c: ServerConfig | null, t: Record<string, string>) => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ServerConfig>(() =>
    mergeConfig(load<Partial<ServerConfig> | null>(LS_KEYS.config, null)),
  );
  const [users, setUsers] = useState<UserRec[]>(() => {
    const l = load<UserRec[] | null>(LS_KEYS.users, null);
    const base = l && Array.isArray(l) && l.length ? l : DEFAULT_USERS;
    /* демо-доступ skit/skit всегда доступен, даже при устаревшем localStorage */
    const demo = DEFAULT_USERS[0];
    return base.some((u) => u.login === demo.login) ? base : [demo, ...base];
  });
  const [sessionId, setSessionId] = useState<string | null>(() =>
    load<string | null>(LS_KEYS.session, null),
  );
  const [roomId, setRoomIdState] = useState<string>(() => load(LS_KEYS.room, ROOMS[0].id));
  const [templates, setTemplates] = useState<Record<string, string>>(() => {
    const l = load<Record<string, string> | null>(LS_KEYS.templates, null);
    return { ...DEFAULT_TEMPLATES, ...(l ?? {}) };
  });
  const [templateTick, setTemplateTick] = useState(0);

  useEffect(() => save(LS_KEYS.config, config), [config]);
  useEffect(() => save(LS_KEYS.users, users), [users]);
  useEffect(() => save(LS_KEYS.session, sessionId), [sessionId]);
  useEffect(() => save(LS_KEYS.room, roomId), [roomId]);
  useEffect(() => save(LS_KEYS.templates, templates), [templates]);

  const me = useMemo(() => users.find((u) => u.id === sessionId) ?? null, [users, sessionId]);

  const myRooms = useMemo(
    () => (me ? ROOMS.filter((r) => me.isAdmin || me.view.includes(r.id)) : []),
    [me],
  );

  const effRoomId = myRooms.some((r) => r.id === roomId)
    ? roomId
    : (myRooms[0]?.id ?? ROOMS[0].id);
  const room = ROOMS.find((r) => r.id === effRoomId) ?? ROOMS[0];

  const login = useCallback(
    async (loginStr: string, password: string): Promise<UserRec | null> => {
      const l = loginStr.trim().toLowerCase();
      /* 1) если БД доступна — проверяем через RPC (пароль не попадает в список) */
      if (backend.online) {
        try {
          const u = await backend.checkLogin(l, password);
          if (u) {
            setSessionId(u.id);
            const first = ROOMS.find((r) => u.isAdmin || u.view.includes(r.id));
            if (first) setRoomIdState(first.id);
            log.info("AUTH", `Вход в систему: ${u.name} (${l})`, "источник: PostgreSQL");
            backend.audit("auth", `Вход в систему: ${u.name}`, u.name);
            return u;
          }
          return null;
        } catch {
          /* БД отвалилась в процессе — переходим к локальной проверке */
        }
      }
      /* 2) локальный режим — сравнение с гидрированным списком */
      const u = users.find((x) => x.login.toLowerCase() === l && x.password === password);
      if (!u) return null;
      setSessionId(u.id);
      const first = ROOMS.find((r) => u.isAdmin || u.view.includes(r.id));
      if (first) setRoomIdState(first.id);
      log.info("AUTH", `Вход в систему: ${u.name} (${l})`, "источник: локальный список");
      return u;
    },
    [users],
  );

  const logout = useCallback(() => setSessionId(null), []);

  const createUser = useCallback(
    (data: Omit<UserRec, "id">): UserRec => {
      const id = `u${Date.now().toString(36)}`;
      const u: UserRec = { ...data, id };
      setUsers((prev) => [...prev, u]);
      log.info("AUTH", `Создан пользователь ${u.name} (${u.login})`, u.isAdmin ? "роль: администратор" : "роль: пользователь");
      if (backend.online)
        backend.upsertUser(u).catch((e) => log.error("DB", "Не удалось сохранить нового пользователя в БД", String(e)));
      return u;
    },
    [],
  );

  const deleteUser = useCallback(
    (id: string): boolean => {
      const target = users.find((u) => u.id === id);
      if (!target) return false;
      if (target.isAdmin && users.filter((u) => u.isAdmin).length <= 1) return false; // последний админ
      setUsers((prev) => prev.filter((u) => u.id !== id));
      log.info("AUTH", `Удалён пользователь ${target.name} (${target.login})`);
      if (backend.online)
        backend.deleteUser(id).catch((e) => log.error("DB", "Не удалось удалить пользователя из БД", String(e)));
      return true;
    },
    [users],
  );

  const setRoomId = useCallback((id: string) => setRoomIdState(id), []);

  const saveConfig = useCallback((c: ServerConfig) => {
    log.info(
      "CONFIG",
      "Конфигурация серверов сохранена",
      `MACROSCOP=${c.macroscop.host}:${c.macroscop.port}(${c.macroscop.enabled ? "вкл" : "выкл"}) · Mumble=${c.mumble.host}:${c.mumble.port}(${c.mumble.enabled ? "вкл" : "выкл"}) · ONLYOFFICE=${c.onlyoffice.dsUrl}(${c.onlyoffice.enabled ? "вкл" : "выкл"})`,
    );
    setConfig(c);
    if (backend.online) backend.saveConfig(c).catch((e) => log.error("DB", "Не удалось сохранить конфиг в БД", String(e)));
  }, []);

  const patchUser = useCallback(
    (id: string, patch: Partial<UserRec>): boolean => {
      const target = users.find((u) => u.id === id);
      if (!target) return false;
      /* защита от блокировки: нельзя снять права у последнего админа */
      if (patch.isAdmin === false && target.isAdmin) {
        const admins = users.filter((u) => u.isAdmin);
        if (admins.length <= 1) return false;
      }
      const merged = { ...target, ...patch };
      setUsers((prev) => prev.map((u) => (u.id === id ? merged : u)));
      if (backend.online)
        backend.upsertUser(merged).catch((e) => log.error("DB", "Не удалось сохранить пользователя в БД", String(e)));
      return true;
    },
    [users],
  );

  const resetAll = useCallback(() => {
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
    setConfig(DEFAULT_CONFIG);
    setUsers(DEFAULT_USERS);
    setTemplates(DEFAULT_TEMPLATES);
    setRoomIdState(ROOMS[0].id);
  }, []);

  /* ── шаблоны протоколов (по комнатам) ── */
  const getTemplate = useCallback(
    (id: string) => templates[id] ?? DEFAULT_TEMPLATES[id] ?? "",
    [templates],
  );

  const saveTemplate = useCallback((id: string, text: string) => {
    const r = ROOMS.find((x) => x.id === id);
    setTemplates((prev) => ({ ...prev, [id]: text }));
    log.info("TEMPLATE", `Шаблон протокола сохранён для комнаты ${r ? r.code : id}`, `${text.length} симв.`);
    if (backend.online)
      backend.saveTemplate(id, text).catch((e) => log.error("DB", "Не удалось сохранить шаблон в БД", String(e)));
  }, []);

  const resetTemplate = useCallback((id: string) => {
    const r = ROOMS.find((x) => x.id === id);
    const body = DEFAULT_TEMPLATES[id] ?? "";
    setTemplates((prev) => ({ ...prev, [id]: body }));
    log.info("TEMPLATE", `Шаблон комнаты ${r ? r.code : id} сброшен к стандартному`);
    if (backend.online)
      backend.saveTemplate(id, body).catch((e) => log.error("DB", "Не удалось сохранить шаблон в БД", String(e)));
  }, []);

  /** Применяет шаблон (с подстановкой переменных) как содержимое документа комнаты. */
  const applyTemplateToDoc = useCallback(
    (id: string) => {
      const r = ROOMS.find((x) => x.id === id);
      if (!r) return;
      const rendered = renderTemplate(templates[id] ?? DEFAULT_TEMPLATES[id] ?? "", r);
      try {
        localStorage.setItem(docLsKey(id), rendered);
      } catch {
        /* ignore */
      }
      setTemplateTick((t) => t + 1);
      log.info("TEMPLATE", `Шаблон применён к документу комнаты ${r.code}`, "документ перезаписан");
      if (backend.online) {
        backend.saveDocument(id, rendered, me?.name ?? null, 1).catch((e) =>
          log.error("DB", "Не удалось сохранить документ в БД", String(e)),
        );
        backend.audit("doc", `Документ комнаты ${r.code} перезаписан по шаблону`, me?.name ?? null);
      }
    },
    [templates, me],
  );

  const hydrateFromDb = useCallback(
    (u: UserRec[], c: ServerConfig | null, t: Record<string, string>) => {
      if (u.length) setUsers(u);
      if (c) setConfig(mergeConfig(c));
      setTemplates({ ...DEFAULT_TEMPLATES, ...t });
    },
    [],
  );

  const value: StoreValue = {
    config,
    users,
    me,
    roomId: effRoomId,
    room,
    myRooms,
    login,
    logout,
    createUser,
    deleteUser,
    setRoomId,
    saveConfig,
    patchUser,
    resetAll,
    templates,
    templateTick,
    getTemplate,
    saveTemplate,
    resetTemplate,
    applyTemplateToDoc,
    hydrateFromDb,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore вне StoreProvider");
  return v;
}
