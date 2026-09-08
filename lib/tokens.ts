/** Guards a typo like one trailing zero too many from going in unnoticed. */
export const MAX_TOKENS_PER_NIGHT = 1_000_000;

export type ParsedTokens = { tokens: number } | { error: string };

/**
 * The amount is usually pasted from the Chaturbate dashboard rather than
 * typed, so it arrives with commas, spaces, or a "tk" suffix attached.
 */
export function parseTokenAmount(raw: string): ParsedTokens {
  const cleaned = raw.trim().replace(/[,\s]/g, "").replace(/tk$/i, "");

  if (!/^\d+$/.test(cleaned)) return { error: "Tokens must be a whole number." };

  const tokens = Number(cleaned);
  if (tokens <= 0) return { error: "Enter a number above zero." };
  if (tokens > MAX_TOKENS_PER_NIGHT) {
    return { error: "That looks like a typo — check the number." };
  }

  return { tokens };
}
