import {
  parseTokenAmount,
  MAX_TOKENS_PER_NIGHT,
  tokensToUsd,
  formatUsd,
  formatTokens,
} from "../lib/tokens";

let failures = 0;

function check(label: string, condition: boolean, extra = "") {
  console.log(`${condition ? "  PASS" : "  FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!condition) failures++;
}

function accepts(raw: string, expected: number) {
  const result = parseTokenAmount(raw);
  check(
    `"${raw}" -> ${expected}`,
    "tokens" in result && result.tokens === expected,
    "error" in result ? result.error : "",
  );
}

function rejects(raw: string, why: string) {
  const result = parseTokenAmount(raw);
  check(`"${raw}" rejected (${why})`, "error" in result);
}

console.log("\nWhat the stream manager actually pastes");
accepts("4820", 4820);
accepts("4,820", 4820);
accepts(" 4820 ", 4820);
accepts("4820 tk", 4820);
accepts("4,820tk", 4820);
accepts("4 820", 4820);
accepts("1", 1);
accepts(String(MAX_TOKENS_PER_NIGHT), MAX_TOKENS_PER_NIGHT);

console.log("\nWhat should bounce back");
rejects("", "empty");
rejects("0", "zero earns nothing");
rejects("-500", "negative");
rejects("48.20", "not a whole number");
rejects("lots", "words");
rejects("4820x", "trailing junk");
rejects(String(MAX_TOKENS_PER_NIGHT + 1), "over the sanity cap");
rejects("1e6", "scientific notation is a typo, not a number");

console.log("\nTokens converted to dollars at five cents each");
check("1,000 tk is $50.00", formatUsd(tokensToUsd(1000)) === "$50.00", formatUsd(tokensToUsd(1000)));
check("4,820 tk is $241.00", formatUsd(tokensToUsd(4820)) === "$241.00", formatUsd(tokensToUsd(4820)));
check("1 tk is $0.05", formatUsd(tokensToUsd(1)) === "$0.05", formatUsd(tokensToUsd(1)));
check("0 tk is $0.00", formatUsd(tokensToUsd(0)) === "$0.00", formatUsd(tokensToUsd(0)));
check("odd token counts keep cents", formatUsd(tokensToUsd(4821)) === "$241.05", formatUsd(tokensToUsd(4821)));
check("large totals get separators", formatUsd(tokensToUsd(250000)) === "$12,500.00", formatUsd(tokensToUsd(250000)));
check("token counts get separators", formatTokens(4820) === "4,820 tk", formatTokens(4820));

console.log(failures === 0 ? "\nAll token checks passed.\n" : `\n${failures} FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
