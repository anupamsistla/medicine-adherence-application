export const NO_EM_DASH_INSTRUCTION =
  "Never use em dashes (—) in your response. Use a period, comma, or parentheses instead.";

export function stripEmDashes(text: string): string {
  return text.replace(/\s*—\s*/g, ", ");
}
