const CHUNK_SIZE_WORDS = 350;
const CHUNK_OVERLAP_WORDS = 50;

/** Splits text into overlapping word-count chunks, preserving paragraph breaks where possible. */
export function chunkText(text: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + CHUNK_SIZE_WORDS, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end === words.length) break;
    start = end - CHUNK_OVERLAP_WORDS;
  }

  return chunks;
}
