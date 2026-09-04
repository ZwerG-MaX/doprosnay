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
  name: string;
  title: string;
  isAdmin: boolean;
  color: string;
  muted?: boolean;
  view: string[]; // права просмотра комнат
  edit: string[]; // права редактирования ONLYOFFICE
}

export interface ServerConfig {
  macroscop: { host: string; port: number; proto: "rtsp" | "https" };
  mumble: { host: string; port: number };
  onlyoffice: { dsUrl: string; jwt: string; docUrl: string };
}

/* ── источники видеопотоков ───────────────────────── */

const IMG_A =
  "https://image.qwenlm.ai/generated-images/e2b3786d-b717-4086-b3e8-8c995d4189b5/_result.png";
const IMG_B =
  "https://image.qwenlm.ai/generated-images/c0a28a84-23da-415b-a0a8-0b2e4915afbc/_result.png";
const IMG_C =
  "https://image.qwenlm.ai/generated-images/21fdf25a-e53b-4830-98b1-3344d1c2c7b1/_result.png";

/* ── комнаты ──────────────────────────────────────── */

export const ROOMS: RoomDef[] = [
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
  {
    id: "r2",
    code: "Д-02",
    name: "Допросная №2",
    mumbleChannel: "Допросная №2",
    docTitle: "Протокол наблюдения — комната №2",
    docKey: "d02-2026-0417",
    cameras: [
      { id: "cam01", num: "CAM 01", label: "ШИРОКИЙ УГОЛ", rtsp: "", src: IMG_B, kb: "kb-2" },
      { id: "cam02", num: "CAM 02", label: "ЛИЦО КРУПНО", rtsp: "", src: IMG_A, kb: "kb-1" },
      { id: "cam03", num: "CAM 03", label: "ПОТОЛОЧНАЯ", rtsp: "", src: IMG_C, kb: "kb-3" },
    ],
  },
  {
    id: "r3",
    code: "К-01",
    name: "Комната очных ставок",
    mumbleChannel: "Очная ставка",
    docTitle: "Протокол очной ставки",
    docKey: "k01-2026-0417",
    cameras: [
      { id: "cam01", num: "CAM 01", label: "ОБЩИЙ ПЛАН", rtsp: "", src: IMG_C, kb: "kb-3" },
      { id: "cam02", num: "CAM 02", label: "БОКОВОЙ РАКУРС", rtsp: "", src: IMG_A, kb: "kb-1" },
    ],
  },
];

/* ── пользователи и права (по умолчанию) ──────────── */

export const DEFAULT_USERS: UserRec[] = [
  { id: "u1", name: "майор Соколов", title: "старший смены", isAdmin: true, color: "#00b0f0", view: ["r1", "r2", "r3"], edit: ["r1", "r2", "r3"] },
  { id: "u2", name: "капитан Ерёмина", title: "оперуполномоченный", isAdmin: false, color: "#f04e9a", view: ["r1", "r2", "r3"], edit: ["r1", "r2"] },
  { id: "u3", name: "ст. л-т Волков", title: "оперуполномоченный", isAdmin: false, color: "#31d98a", view: ["r1", "r2"], edit: ["r1"] },
  { id: "u4", name: "Данилова О. В.", title: "психолог", isAdmin: false, color: "#b57bff", view: ["r2"], edit: [] },
  { id: "u5", name: "Гущин П. А.", title: "оперативник", isAdmin: false, color: "#ff8a3d", muted: true, view: ["r1"], edit: [] },
  { id: "u6", name: "Ким С. Р.", title: "делопроизводитель", isAdmin: false, color: "#ffd83d", view: ["r1", "r2"], edit: ["r1", "r2"] },
  { id: "u7", name: "Ланская Е. А.", title: "прокурор-наблюдатель", isAdmin: false, color: "#7a9bff", view: ["r1", "r2"], edit: [] },
  { id: "u8", name: "Крамаренко Д. И.", title: "ст. оперуполномоченный", isAdmin: false, color: "#ff6b6b", view: ["r1", "r3"], edit: ["r3"] },
];

/* ── конфигурация серверов (по умолчанию) ─────────── */

export const DEFAULT_CONFIG: ServerConfig = {
  macroscop: { host: "vms-2.rt-cloud.local", port: 554, proto: "rtsp" },
  mumble: { host: "10.77.2.15", port: 64738 },
  onlyoffice: {
    dsUrl: "https://docs.rt-cloud.local",
    jwt: "",
    docUrl: "https://nas-2.rt-cloud.local/docs/protokol-doprosa.docx",
  },
};

export const LS_KEYS = {
  config: "rt-dopros.config.v2",
  users: "rt-dopros.users.v2",
  session: "rt-dopros.session.v2",
  room: "rt-dopros.room.v2",
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
