import { describe, expect, it } from "vitest";
import { phraseMatches } from "../src/shared/prompt";

describe("reflection prompt matching", () => {
  it("supports exact case-insensitive matching", () => {
    expect(phraseMatches("i am scrolling mindlessly", {
      phrase: "I am scrolling mindlessly",
      caseSensitive: false,
      matchMode: "exact",
      buttonRestore: false
    })).toBe(true);
  });

  it("supports forgiving matching for minor typos", () => {
    expect(phraseMatches("I am scroling mindlessley", {
      phrase: "I am scrolling mindlessly",
      caseSensitive: false,
      matchMode: "forgiving",
      buttonRestore: false
    })).toBe(true);
  });

  it("respects case-sensitive matching", () => {
    expect(phraseMatches("i am scrolling mindlessly", {
      phrase: "I am scrolling mindlessly",
      caseSensitive: true,
      matchMode: "exact",
      buttonRestore: false
    })).toBe(false);
  });
});
