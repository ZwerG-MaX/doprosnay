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
  DEFAULT_USERS,
  LS_KEYS,
  ROOMS,
  type RoomDef,
  type ServerConfig,
  type UserRec,
} from "./data";

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
  login: (userId: string) => void;
  logout: () => void;
  setRoomId: (id: string) => void;
  saveConfig: (c: ServerConfig) => void;
  patchUser: (id: string, patch: Partial<UserRec>) => boolean;
  resetAll: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ServerConfig>(() =>
    mergeConfig(load<Partial<ServerConfig> | null>(LS_KEYS.config, null)),
  );
  const [users, setUsers] = useState<UserRec[]>(() => {
    const l = load<UserRec[] | null>(LS_KEYS.users, null);
    return l && Array.isArray(l) && l.length ? l : DEFAULT_USERS;
  });
  const [sessionId, setSessionId] = useState<string | null>(() =>
    load<string | null>(LS_KEYS.session, null),
  );
  const [roomId, setRoomIdState] = useState<string>(() => load(LS_KEYS.room, ROOMS[0].id));

  useEffect(() => save(LS_KEYS.config, config), [config]);
  useEffect(() => save(LS_KEYS.users, users), [users]);
  useEffect(() => save(LS_KEYS.session, sessionId), [sessionId]);
  useEffect(() => save(LS_KEYS.room, roomId), [roomId]);

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
    (userId: string) => {
      const u = users.find((x) => x.id === userId);
      if (!u) return;
      setSessionId(userId);
      const first = ROOMS.find((r) => u.isAdmin || u.view.includes(r.id));
      if (first) setRoomIdState(first.id);
    },
    [users],
  );

  const logout = useCallback(() => setSessionId(null), []);

  const setRoomId = useCallback((id: string) => setRoomIdState(id), []);

  const saveConfig = useCallback((c: ServerConfig) => setConfig(c), []);

  const patchUser = useCallback(
    (id: string, patch: Partial<UserRec>): boolean => {
      const target = users.find((u) => u.id === id);
      if (!target) return false;
      /* защита от блокировки: нельзя снять права у последнего админа */
      if (patch.isAdmin === false && target.isAdmin) {
        const admins = users.filter((u) => u.isAdmin);
        if (admins.length <= 1) return false;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
      return true;
    },
    [users],
  );

  const resetAll = useCallback(() => {
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
    setConfig(DEFAULT_CONFIG);
    setUsers(DEFAULT_USERS);
    setRoomIdState(ROOMS[0].id);
  }, []);

  const value: StoreValue = {
    config,
    users,
    me,
    roomId: effRoomId,
    room,
    myRooms,
    login,
    logout,
    setRoomId,
    saveConfig,
    patchUser,
    resetAll,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore вне StoreProvider");
  return v;
}
