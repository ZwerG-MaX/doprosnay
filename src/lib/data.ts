/* ── типы ─────────────────────────────────────────── */

export type EventType = "sys" | "video" | "audio" | "doc";

export interface EventItem {
  id: number;
  time: string;
  type: EventType;
  text: string;
}

export interface CameraDef {
  id: string;
  num: string;
  label: string;
  rtsp: string;
  src: string;
  kb: string;
}

export interface Observer {
  n: number;
  tag: string;
  name: string;
  role: string;
  color: string;
  muted: boolean;
}

export interface RoomDef {
  id: string;
  code: string;
  name: string;
  mumbleChannel: string;
  docTitle: string;
  docKey: string;
  cameras: CameraDef[];
}

export interface UserRec {
  id: string;
  login: string; // логин для авторизации
  password: string; // пароль (в проде — хэш на сервере)
  name: string;
  title: string;
  isAdmin: boolean;
  color: string;
  muted?: boolean;
  view: string[]; // права просмотра комнат
  edit: string[]; // права редактирования ONLYOFFICE
}

export interface ServerConfig {
  macroscop: { host: string; port: number; proto: "rtsp" | "https"; enabled: boolean };
  mumble: { host: string; port: number; enabled: boolean; webUrl: string };
  onlyoffice: { dsUrl: string; jwt: string; docUrl: string; enabled: boolean };
  backend: { enabled: boolean; apiUrl: string };
}

/* ── источники видеопотоков ───────────────────────── */

const IMG_A =
  "https://image.qwenlm.ai/generated-images/e2b3786d-b717-4086-b3e8-8c995d4189b5/_result.png";
const IMG_B =
  "https://image.qwenlm.ai/generated-images/c0a28a84-23da-415b-a0a8-0b2e4915afbc/_result.png";
const IMG_C =
  "https://image.qwenlm.ai/generated-images/21fdf25a-e53b-4830-98b1-3344d1c2c7b1/_result.png";

/** Пресеты видеокадров, которые админ может назначать камерам новых комнат. */
export const CAM_PRESETS: { id: string; label: string; src: string; kb: string }[] = [
  { id: "A", label: "Общий план", src: IMG_A, kb: "kb-1" },
  { id: "B", label: "Крупный план", src: IMG_B, kb: "kb-2" },
  { id: "C", label: "Вид сверху", src: IMG_C, kb: "kb-3" },
];

/* ── комнаты ──────────────────────────────────────── */

/** Комнаты по умолчанию — одна допросная. Остальные добавляет администратор. */
export const DEFAULT_ROOMS: RoomDef[] = [
  {
    id: "r1",
    code: "Д-01",
    name: "Допросная №1",
    mumbleChannel: "Допросная №1",
    docTitle: "Протокол допроса — комната №1",
    docKey: "d01-2026-0417",
    cameras: [
      { id: "cam01", num: "CAM 01", label: "ОБЩИЙ ПЛАН", rtsp: "", src: IMG_A, kb: "kb-1" },
      { id: "cam02", num: "CAM 02", label: "КРУПНЫЙ ПЛАН", rtsp: "", src: IMG_B, kb: "kb-2" },
      { id: "cam03", num: "CAM 03", label: "ВИД СВЕРХУ", rtsp: "", src: IMG_C, kb: "kb-3" },
    ],
  },
];

/** Генерация уникального id для новой комнаты. */
export const genRoomId = () => `r${Date.now().toString(36)}${Math.floor(Math.random() * 90 + 10)}`;

/** Сборка новой камеры из пресета кадра. */
export function makeCamera(presetId: string, index: number): CameraDef {
  const p = CAM_PRESETS.find((x) => x.id === presetId) ?? CAM_PRESETS[0];
  const n = String(index).padStart(2, "0");
  return {
    id: `cam${n}${Date.now().toString(36)}`,
    num: `CAM ${n}`,
    label: p.label.toUpperCase(),
    rtsp: "",
    src: p.src,
    kb: p.kb,
  };
}

/* ── пользователи и права (по умолчанию) ──────────── */

export const DEFAULT_USERS: UserRec[] = [
  { id: "u0", login: "skit", password: "skit", name: "Оператор СКИТ", title: "демо-доступ", isAdmin: true, color: "#7a28cb", view: ["r1", "r2", "r3"], edit: ["r1", "r2", "r3"] },
  { id: "u1", login: "sokolov", password: "skit", name: "Соколов", title: "специалист", isAdmin: true, color: "#00b0f0", view: ["r1", "r2", "r3"], edit: ["r1", "r2", "r3"] },
  { id: "u2", login: "eremina", password: "skit", name: "Ерёмина", title: "специалист", isAdmin: false, color: "#f04e9a", view: ["r1", "r2", "r3"], edit: ["r1", "r2"] },
  { id: "u3", login: "volkov", password: "skit", name: "Волков", title: "специалист", isAdmin: false, color: "#31d98a", view: ["r1", "r2"], edit: ["r1"] },
  { id: "u4", login: "danilova", password: "skit", name: "Данилова О. В.", title: "специалист", isAdmin: false, color: "#b57bff", view: ["r2"], edit: [] },
  { id: "u5", login: "gushchin", password: "skit", name: "Гущин П. А.", title: "специалист", isAdmin: false, color: "#ff8a3d", muted: true, view: ["r1"], edit: [] },
  { id: "u6", login: "kim", password: "skit", name: "Ким С. Р.", title: "специалист", isAdmin: false, color: "#ffd83d", view: ["r1", "r2"], edit: ["r1", "r2"] },
  { id: "u7", login: "lanskaya", password: "skit", name: "Ланская Е. А.", title: "специалист", isAdmin: false, color: "#7a9bff", view: ["r1", "r2"], edit: [] },
  { id: "u8", login: "kramarenko", password: "skit", name: "Крамаренко Д. И.", title: "специалист", isAdmin: false, color: "#ff6b6b", view: ["r1", "r3"], edit: ["r3"] },
];

/* ── конфигурация серверов (по умолчанию) ─────────── */

export const DEFAULT_CONFIG: ServerConfig = {
  macroscop: { host: "vms-2.rt-cloud.local", port: 554, proto: "rtsp", enabled: true },
  mumble: { host: "10.77.2.15", port: 64738, enabled: true, webUrl: "http://mumble.local" },
  onlyoffice: {
    dsUrl: "https://docs.rt-cloud.local",
    jwt: "",
    docUrl: "https://nas-2.rt-cloud.local/docs/protokol-doprosa.docx",
    enabled: true,
  },
  backend: { enabled: true, apiUrl: "http://api.local" },
};

export const LS_KEYS = {
  config: "rt-dopros.config.v2",
  users: "rt-dopros.users.v2",
  session: "rt-dopros.session.v2",
  room: "rt-dopros.room.v2",
  rooms: "rt-dopros.rooms.v2",
  templates: "rt-dopros.templates.v2",
};

/* ── фразы для симуляции совместного редактирования ─ */

export const PHRASES: string[] = [
  "Фигурант теребит манжет, взгляд в пол.",
  "Просит повторить вопрос, тянет время.",
  "Защитник делает пометку, просит уточнить формулировку.",
  "Пауза в диалоге около 40 секунд.",
  "Руки сцеплены, пальцы сжаты (верхний ракурс).",
  "Следователь предъявил документ — фигурант отклонился от стола.",
  "Признаки усталости: трёт глаза, осанка стала ниже.",
  "Фигурант смотрит в сторону зеркала (стекла).",
  "Голос ровный, но темп речи заметно ускорился.",
  "Просит воду. Передали через конвой.",
  "Упоминает «встречу в марте» — зафиксировать для проверки.",
  "Смена позы: сел ближе к краю стола, локти на столешнице.",
  "Микровыражение — сжатие губ после вопроса о счетах.",
  "Дыхание учащённое, ёрзает на стуле.",
];

/* ── шаблоны протоколов (по комнатам) ─────────────── */

/** Ключ локального хранилища для документа комнаты. */
export const docLsKey = (roomId: string) => `rt-dopros.doc.${roomId}`;

/** Переменные, подставляемые в шаблон при создании документа. */
export const TEMPLATE_VARS = ["{ДАТА}", "{ВРЕМЯ}", "{КОМНАТА}", "{ДЕЛО}", "{КАНАЛ}"] as const;

/** Разделители и «рыба» для новых шаблонов. */
export const TEMPLATE_SNIPPETS: { label: string; text: string }[] = [
  { label: "Разделитель", text: "\n── ───────────────────────────────────────────────\n" },
  { label: "Блок «Показания»", text: "\n── ПОКАЗАНИЯ ──\n\n" },
  { label: "Блок «Вопрос–ответ»", text: "\nВ.: \nО.: \n" },
  { label: "Подписи", text: "\n\nПодписи сторон:\nСледователь: ______________\nЗащитник: ______________\n" },
];

export const DEFAULT_TEMPLATES: Record<string, string> = {
  r1: `ПРОТОКОЛ ДОПРОСА
Комната: {КОМНАТА} · Дело № {ДЕЛО}
Дата: {ДАТА} · Время начала: {ВРЕМЯ} · Аудиоканал: {КАНАЛ}

── УСТАНОВОЧНАЯ ЧАСТЬ ──
Следователь: 
Допрашиваемый: 
Защитник: 

── ПОКАЗАНИЯ ──
В.: 
О.: 

── ЗАМЕЧАНИЯ И ХОДАТАЙСТВА ──


Подписи сторон:
Следователь: ______________
Допрашиваемый: ______________
Защитник: ______________`,

  r2: `ПРОТОКОЛ СОВМЕСТНОГО НАБЛЮДЕНИЯ
Комната: {КОМНАТА} · Дело № {ДЕЛО}
Дата: {ДАТА} · Смена: {ВРЕМЯ} · Аудиоканал: {КАНАЛ}

── ЗАПИСИ НАБЛЮДАТЕЛЕЙ ──
[Н-1] 
[Н-2] 
[Н-3] 

── ПОВЕДЕНЧЕСКИЕ МАРКЕРЫ ──


── ИТОГИ НАБЛЮДЕНИЯ ──


Старший смены: ______________`,

  r3: `ПРОТОКОЛ ОЧНОЙ СТАВКИ
Комната: {КОМНАТА} · Дело № {ДЕЛО}
Дата: {ДАТА} · Время: {ВРЕМЯ} · Аудиоканал: {КАНАЛ}

── УЧАСТНИКИ ──
Лицо 1: 
Лицо 2: 

── ХОД ОЧНОЙ СТАВКИ ──


── ПОКАЗАНИЯ ──


Подписи сторон:
Следователь: ______________`,
};

/** Универсальный шаблон для комнат, у которых нет собственного (добавленных админом). */
export const GENERIC_TEMPLATE = `ПРОТОКОЛ НАБЛЮДЕНИЯ
Комната: {КОМНАТА} · Дело № {ДЕЛО}
Дата: {ДАТА} · Время: {ВРЕМЯ} · Аудиоканал: {КАНАЛ}

── УСТАНОВОЧНАЯ ЧАСТЬ ──


── ЗАПИСИ НАБЛЮДАТЕЛЕЙ ──


── ИТОГИ ──


Подписи сторон:
Следователь: ______________
Старший смены: ______________`;

const p2 = (n: number) => String(n).padStart(2, "0");

/** Подставляет переменные ({ДАТА}, {ВРЕМЯ}, …) в шаблон для конкретной комнаты. */
export function renderTemplate(tpl: string, room: RoomDef): string {
  const d = new Date();
  const vars: Record<string, string> = {
    "{ДАТА}": `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`,
    "{ВРЕМЯ}": `${p2(d.getHours())}:${p2(d.getMinutes())}`,
    "{КОМНАТА}": `${room.code} · ${room.name}`,
    "{ДЕЛО}": "2026/0417",
    "{КАНАЛ}": room.mumbleChannel,
  };
  let out = tpl;
  for (const key of Object.keys(vars)) out = out.split(key).join(vars[key]);
  return out;
}
