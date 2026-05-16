import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/shared/defaults";
import { clearPausedHost, effectiveSettings, normalizeHost, upsertSiteRule, wildcardMatches } from "../src/shared/siteRules";

describe("site rules", () => {
  it("normalizes hosts and supports wildcard rules", () => {
    expect(normalizeHost("https://www.reddit.com/r/all")).toBe("reddit.com");
    expect(wildcardMatches("*.reddit.com", "old.reddit.com")).toBe(true);
    expect(wildcardMatches("reddit.com", "old.reddit.com")).toBe(false);
  });

  it("excludes a site in all-sites mode", () => {
    const settings = upsertSiteRule(DEFAULT_SETTINGS, "reddit.com", false);
    const effective = effectiveSettings(settings, "https://reddit.com/r/all");
    expect(effective.enabled).toBe(false);
    expect(effective.reason).toBe("Site is excluded");
  });

  it("requires inclusion in selected-sites mode", () => {
    const settings = { ...DEFAULT_SETTINGS, siteMode: "only_selected" as const, siteRules: [] };
    expect(effectiveSettings(settings, "https://example.com").enabled).toBe(false);
    expect(effectiveSettings(upsertSiteRule(settings, "example.com", true), "https://example.com").enabled).toBe(true);
  });

  it("applies per-site prompt, cooldown, visual, and preset overrides", () => {
    const effective = effectiveSettings({
      ...DEFAULT_SETTINGS,
      siteRules: [{
        id: "example",
        pattern: "*.example.com",
        mode: "include",
        preset: "strict",
        promptPhrase: "This is intentional",
        cooldownMs: 120_000,
        grayscaleMax: 0.5,
        blurMaxPx: 8
      }]
    }, "https://feed.example.com");

    expect(effective.enabled).toBe(true);
    expect(effective.preset).toBe("strict");
    expect(effective.prompt.phrase).toBe("This is intentional");
    expect(effective.thresholds.cooldownMs).toBe(120_000);
    expect(effective.visual.grayscaleMax).toBe(0.5);
    expect(effective.visual.blurMaxPx).toBe(8);
  });

  it("clears paused-until state when re-enabling a site", () => {
    const host = "reddit.com";
    const settings = {
      ...DEFAULT_SETTINGS,
      pausedUntilByHost: {
        [host]: Date.now() + 60_000
      }
    };
    const cleared = clearPausedHost(settings, host);
    expect(cleared.pausedUntilByHost[host]).toBeUndefined();
  });
});
