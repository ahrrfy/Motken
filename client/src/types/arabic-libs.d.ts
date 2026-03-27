declare module "arabic-reshaper" {
  const ArabicReshaper: {
    convertArabic(text: string): string;
    convertArabicBack(text: string): string;
  };
  export default ArabicReshaper;
}

declare module "bidi-js" {
  interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  }

  interface BidiInstance {
    getEmbeddingLevels(text: string, direction?: "ltr" | "rtl" | "auto"): EmbeddingLevels;
    getReorderedString(text: string, embeddingLevels: EmbeddingLevels): string;
    getReorderedIndices(text: string, embeddingLevels: EmbeddingLevels): number[];
    getReorderSegments(text: string, embeddingLevels: EmbeddingLevels): number[][];
    getMirroredCharactersMap(text: string, embeddingLevels: EmbeddingLevels): Map<number, string>;
    getBidiCharType(char: string): number;
    getBidiCharTypeName(char: string): string;
  }

  function bidiFactory(): BidiInstance;
  export default bidiFactory;
}
