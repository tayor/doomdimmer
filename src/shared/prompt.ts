import type { PromptSettings } from "./types";

export function normalizePhrase(value: string, caseSensitive: boolean): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

export function phraseMatches(input: string, settings: PromptSettings): boolean {
  const expected = normalizePhrase(settings.phrase, settings.caseSensitive);
  const actual = normalizePhrase(input, settings.caseSensitive);
  if (settings.matchMode === "exact") return actual === expected;
  return levenshtein(actual, expected) <= Math.max(1, Math.floor(expected.length * 0.12));
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}
