// Type declarations for mammoth
declare module 'mammoth' {
  interface ConvertResult {
    value: string;
    messages: any[];
  }

  interface ExtractRawTextResult {
    value: string;
  }

  interface Options {
    styleMap?: string;
    includeDefaultStyleMap?: boolean;
    convertImage?: (image: {
      imageBuffer: Buffer;
      contentType: string;
    }) => { error?: Error } | Promise<{ error?: Error }>;
  }

  export function convertToHtml(
    input: Buffer | string | { arrayBuffer: ArrayBuffer },
    options?: Options
  ): Promise<ConvertResult>;

  export function extractRawText(
    input: Buffer | string | { arrayBuffer: ArrayBuffer }
  ): Promise<ExtractRawTextResult>;
}

// Type declarations for docx
declare module 'docx' {
  export interface IParagraphOptions {
    text?: string;
    children?: any[];
    alignment?: string;
    heading?: string;
    bullet?: { level: number };
    indent?: { left?: number; right?: number };
    spacing?: { before?: number; after?: number; line?: number };
    border?: any;
  }

  export interface IRunOptions {
    text?: string;
    bold?: boolean;
    italics?: boolean;
    underline?: {};
    size?: number;
    font?: string;
    color?: string;
  }

  export interface IDocumentOptions {
    sections?: any[];
    styles?: any;
    creator?: string;
    title?: string;
    description?: string;
  }

  export class Paragraph {
    constructor(options: IParagraphOptions);
  }

  export class Run {
    constructor(options: IRunOptions);
  }

  export class TextRun {
    constructor(options: IRunOptions);
  }

  export class Document {
    constructor(options: IDocumentOptions);
  }

  export class Packer {
    static toBlob(document: Document): Promise<Blob>;
    static toBuffer(document: Document): Promise<Buffer>;
  }

  export const AlignmentType: {
    LEFT: string;
    CENTER: string;
    RIGHT: string;
    JUSTIFIED: string;
  };

  export const HeadingLevel: {
    HEADING_1: string;
    HEADING_2: string;
    HEADING_3: string;
    HEADING_4: string;
    HEADING_5: string;
    HEADING_6: string;
  };

  export const BorderStyle: {
    SINGLE: string;
    DOUBLE: string;
    DOTTED: string;
    DASHED: string;
    NONE: string;
  };
}
