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

/**
 * What one token is worth to the agency, in dollars. Five cents is the payout
 * rate, not the price a viewer pays. Override with TOKEN_RATE_USD if the rate
 * ever changes — nothing else in the app hardcodes it.
 */
export const TOKEN_RATE_USD = Number(process.env.TOKEN_RATE_USD ?? 0.05);

export function tokensToUsd(tokens: number): number {
  return tokens * TOKEN_RATE_USD;
}

/** "$241.00" — always two decimals, so columns of figures line up. */
export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "4,820 tk" */
export function formatTokens(tokens: number): string {
  return `${tokens.toLocaleString("en-US")} tk`;
}
