/* Генерация полноценных .docx-документов в браузере (библиотека docx).
   Тяжёлая библиотека подгружается лениво (code-splitting). */

import type * as DocxNS from "docx";

const FONT = "Arial";

const loadDocx = () => import("docx");

function contentToParagraphs(lib: typeof DocxNS, content: string): DocxNS.Paragraph[] {
  const { AlignmentType, BorderStyle, HeadingLevel, Paragraph, TextRun } = lib;
  return content.split(/\n/).map((raw) => {
    const line = raw.replace(/\s+$/, "");
    const trimmed = line.trim();

    /* разделители ─── */
    if (/^[─—=-]{4,}/.test(trimmed)) {
      return new Paragraph({
        spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "9AA7B8", space: 4 } },
        children: [],
      });
    }

    /* заголовки: ВСЁ КАПСОМ или «ПРОТОКОЛ…» */
    const isHeading =
      trimmed.length > 3 &&
      trimmed.length < 70 &&
      (/^(ПРОТОКОЛ|РАЗДЕЛ|ПРИЛОЖЕНИЕ|ПОЯСНЕНИЯ|ЗАПИСИ)/.test(trimmed) ||
        (trimmed === trimmed.toUpperCase() && /[А-ЯЁ]{3,}/.test(trimmed)));

    if (isHeading) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: trimmed, bold: true, size: 24, font: FONT, color: "123A66" })],
      });
    }

    /* запись соавтора [Н-x · время] */
    const m = trimmed.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (m) {
      return new Paragraph({
        spacing: { before: 60, after: 60 },
        indent: { left: 240 },
        children: [
          new TextRun({ text: `[${m[1]}] `, bold: true, size: 20, font: FONT, color: "B3261E" }),
          new TextRun({ text: m[2], size: 21, font: FONT }),
        ],
      });
    }

    if (trimmed === "") {
      return new Paragraph({ spacing: { before: 40, after: 40 }, children: [] });
    }

    return new Paragraph({
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: line, size: 21, font: FONT })],
    });
  });
}

export interface DocxParams {
  title: string;
  roomCode: string;
  roomName: string;
  content: string;
  authors?: string[];
}

/** Полноценный docx-документ протокола с шапкой и реквизитами. */
export async function buildProtocolDocx(p: DocxParams): Promise<Blob> {
  const lib = await loadDocx();
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } = lib;

  const now = new Date();
  const date = now.toLocaleDateString("ru-RU");
  const time = now.toLocaleTimeString("ru-RU");

  const doc = new Document({
    creator: "Ростелеком · Видеонаблюдение",
    title: p.title,
    description: `Протокол наблюдения · комната ${p.roomCode} (${p.roomName})`,
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: "РОСТЕЛЕКОМ · ВИДЕОНАБЛЮДЕНИЕ", bold: true, size: 18, font: FONT, color: "7A28CB" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "00B0F0", space: 6 } },
            children: [new TextRun({ text: p.title, bold: true, size: 30, font: FONT, color: "123A66" })],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Комната: ", bold: true, size: 20, font: FONT }),
              new TextRun({ text: `${p.roomCode} — ${p.roomName}`, size: 20, font: FONT }),
            ],
          }),
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "Дата формирования: ", bold: true, size: 20, font: FONT }),
              new TextRun({ text: `${date} ${time}`, size: 20, font: FONT }),
            ],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: p.authors?.length
              ? [
                  new TextRun({ text: "Соавторы: ", bold: true, size: 20, font: FONT }),
                  new TextRun({ text: p.authors.join(", "), size: 20, font: FONT }),
                ]
              : [],
          }),
          ...contentToParagraphs(lib, p.content),
          new Paragraph({
            spacing: { before: 320 },
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: "9AA7B8", space: 6 } },
            children: [
              new TextRun({
                text: "Документ сформирован автоматически пультом наблюдения. Подписи сторон — на бумажном экземпляре.",
                italics: true,
                size: 16,
                font: FONT,
                color: "6B7A8C",
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** docx-файл шаблона (для выгрузки текстового шаблона в полноценный документ). */
export async function buildTemplateDocx(title: string, content: string): Promise<Blob> {
  const lib = await loadDocx();
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } = lib;

  const doc = new Document({
    creator: "Ростелеком · Видеонаблюдение",
    title,
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "00B0F0", space: 6 } },
            children: [new TextRun({ text: title, bold: true, size: 28, font: FONT, color: "123A66" })],
          }),
          ...contentToParagraphs(lib, content),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function docxFilename(base: string): string {
  const safe = base.replace(/[\\/:*?"<>|]+/g, "_").trim() || "document";
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `${safe}_${stamp}.docx`;
}
