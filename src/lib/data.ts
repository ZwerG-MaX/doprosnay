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

export const VMS_HOST = "vms-2.macroscop.local";
export const MUMBLE_URL = "mumble://10.77.2.15:64738";

export const CAMERAS: CameraDef[] = [
  {
    id: "cam1",
    num: "CAM 01",
    label: "ОБЩИЙ ПЛАН",
    rtsp: "rtsp://10.77.2.4:554/macroscop/cam01_main",
    src: "https://image.qwenlm.ai/generated-images/e2b3786d-b717-4086-b3e8-8c995d4189b5/_result.png",
    kb: "kb-1",
  },
  {
    id: "cam2",
    num: "CAM 02",
    label: "КРУПНЫЙ ПЛАН",
    rtsp: "rtsp://10.77.2.4:554/macroscop/cam02_main",
    src: "https://image.qwenlm.ai/generated-images/c0a28a84-23da-415b-a0a8-0b2e4915afbc/_result.png",
    kb: "kb-2",
  },
  {
    id: "cam3",
    num: "CAM 03",
    label: "ВИД СВЕРХУ",
    rtsp: "rtsp://10.77.2.4:554/macroscop/cam03_main",
    src: "https://image.qwenlm.ai/generated-images/21fdf25a-e53b-4830-98b1-3344d1c2c7b1/_result.png",
    kb: "kb-3",
  },
];

export const OBSERVERS: Observer[] = [
  { n: 1, tag: "Н-1", name: "майор Соколов", role: "старший смены (вы)", color: "#45c8ff", muted: false },
  { n: 2, tag: "Н-2", name: "капитан Ерёмина", role: "оперуполномоченный", color: "#ffb43a", muted: false },
  { n: 3, tag: "Н-3", name: "ст. л-т Волков", role: "оперуполномоченный", color: "#35d97f", muted: false },
  { n: 4, tag: "Н-4", name: "Данилова О. В.", role: "психолог", color: "#e05cff", muted: false },
  { n: 5, tag: "Н-5", name: "Гущин П. А.", role: "оперативник", color: "#ff7a5c", muted: true },
  { n: 6, tag: "Н-6", name: "Ким С. Р.", role: "делопроизводитель", color: "#b8e04a", muted: false },
  { n: 7, tag: "Н-7", name: "Ланская Е. А.", role: "прокурор-наблюдатель", color: "#5c8dff", muted: false },
  { n: 8, tag: "Н-8", name: "Крамаренко Д. И.", role: "ст. оперуполномоченный", color: "#ff5c8a", muted: false },
];

export const PHRASES: string[] = [
  "Фигурант теребит манжет, взгляд в пол.",
  "Просит повторить вопрос, тянет время.",
  "Защитник делает пометку, просит уточнить формулировку.",
  "Пауза в диалоге около 40 секунд.",
  "CAM 03: руки сцеплены, пальцы сжаты.",
  "Следователь предъявил документ — фигурант отклонился от стола.",
  "Признаки усталости: трёт глаза, осанка стала ниже.",
  "Фигурант смотрит в сторону зеркала (стекла).",
  "Голос ровный, но темп речи заметно ускорился.",
  "Просит воду. Передали через конвой.",
  "Упоминает «встречу в марте» — зафиксировать для проверки.",
  "Смена позы: сел ближе к краю стола, локти на столешнице.",
  "CAM 02: микровыражение — сжатие губ после вопроса о счетах.",
  "Дыхание учащённое, ёрзает на стуле.",
];

export const SEED_PROTOCOL = `ПРОТОКОЛ СОВМЕСТНОГО НАБЛЮДЕНИЯ
Допросная № 2 · дело № 2026/0417 · ст. 159 ч. 4 УК РФ
Фигурант: Савельев Д. И. · Следователь: майор юстиции Ребров А. П.
Видеоканалы: CAM 01–03 (MACROSCOP) · Аудиоканал: Допросная №2 (Mumble)

── ЗАПИСИ НАБЛЮДАТЕЛЕЙ ───────────────────────────────

[Н-2 · 14:02:47] Фигурант спокоен, отвечает односложно.
[Н-4 · 14:05:12] Отмечаю: избегает зрительного контакта со следователем.
[Н-3 · 14:09:38] CAM 02 — руки под столом, жестикуляция закрытая.
[Н-7 · 14:12:04] Прошу зафиксировать: фигурант дважды уточнял про адвоката.`;

export const PROTOCOL_LS_KEY = "doprosnaya2-protocol-v1";
