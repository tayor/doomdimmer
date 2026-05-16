import { DEFAULT_PROMPT_SETTINGS, DEFAULT_SETTINGS, DEFAULT_VISUAL, PRESET_THRESHOLDS } from "./defaults";
import type { DetectionThresholds, DoomDimmerSettings, EffectiveSiteSettings, SensitivityPreset, SiteRule } from "./types";

export function normalizeHost(urlOrHost: string): string {
  try {
    return new URL(urlOrHost).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return urlOrHost.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

export function wildcardMatches(pattern: string, host: string): boolean {
  const normalizedPattern = normalizeHost(pattern).replace(/\./g, "\\.").replace(/\*/g, "[^.]+");
  return new RegExp(`^${normalizedPattern}$`, "i").test(normalizeHost(host));
}

export function findMatchingRule(settings: DoomDimmerSettings, host: string): SiteRule | null {
  return settings.siteRules.find((rule) => wildcardMatches(rule.pattern, host) || wildcardMatches(`*.${rule.pattern}`, host)) ?? null;
}

export function isCommonSite(settings: DoomDimmerSettings, host: string): boolean {
  return settings.commonSites.some((pattern) => wildcardMatches(pattern, host));
}

export function thresholdsForPreset(preset: SensitivityPreset, custom: DetectionThresholds): DetectionThresholds {
  return preset === "custom" ? custom : PRESET_THRESHOLDS[preset];
}

export function mergeSettings(input: Partial<DoomDimmerSettings> = {}): DoomDimmerSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    customThresholds: { ...DEFAULT_SETTINGS.customThresholds, ...(input.customThresholds ?? {}) },
    visual: { ...DEFAULT_VISUAL, ...(input.visual ?? {}) },
    prompt: { ...DEFAULT_PROMPT_SETTINGS, ...(input.prompt ?? {}) },
    siteRules: Array.isArray(input.siteRules) ? input.siteRules : DEFAULT_SETTINGS.siteRules,
    commonSites: Array.isArray(input.commonSites) ? input.commonSites : DEFAULT_SETTINGS.commonSites,
    pausedUntilByHost: input.pausedUntilByHost ?? {}
  };
}

export function effectiveSettings(settingsInput: Partial<DoomDimmerSettings>, urlOrHost: string, now = Date.now()): EffectiveSiteSettings {
  const settings = mergeSettings(settingsInput);
  const host = normalizeHost(urlOrHost);
  const rule = findMatchingRule(settings, host);
  let enabled = settings.enabled;
  let reason = enabled ? undefined : "Global setting is off";

  if (enabled && settings.siteMode === "only_selected") {
    enabled = rule?.mode === "include";
    if (!enabled) reason = "Site is not selected";
  }

  if (enabled && settings.siteMode === "common_infinite_scroll") {
    enabled = isCommonSite(settings, host) || rule?.mode === "include";
    if (!enabled) reason = "Site is outside common infinite-scroll list";
  }

  if (enabled && rule?.mode === "exclude") {
    enabled = false;
    reason = "Site is excluded";
  }

  const pausedUntil = settings.pausedUntilByHost[host] ?? 0;
  if (enabled && pausedUntil > now) {
    enabled = false;
    reason = "Temporarily paused";
  }

  const preset = rule?.preset ?? settings.preset;
  const base = thresholdsForPreset(preset, settings.customThresholds);
  const thresholds = { ...base, ...(rule?.thresholds ?? {}) };
  if (rule?.cooldownMs) thresholds.cooldownMs = rule.cooldownMs;

  return {
    enabled,
    host,
    pattern: rule?.pattern ?? host,
    preset,
    thresholds,
    visual: {
      ...settings.visual,
      grayscaleMax: rule?.grayscaleMax ?? settings.visual.grayscaleMax,
      blurMaxPx: rule?.blurMaxPx ?? settings.visual.blurMaxPx
    },
    prompt: {
      ...settings.prompt,
      phrase: rule?.promptPhrase ?? settings.prompt.phrase
    },
    pausedUntil,
    reason
  };
}

export function upsertSiteRule(settings: DoomDimmerSettings, host: string, enabled: boolean): DoomDimmerSettings {
  const pattern = normalizeHost(host);
  const nextRules = settings.siteRules.filter((rule) => !wildcardMatches(rule.pattern, pattern));
  nextRules.push({ id: `${pattern}-${Date.now()}`, pattern, mode: enabled ? "include" : "exclude" });
  return { ...settings, siteRules: nextRules };
}

export function clearPausedHost(settings: DoomDimmerSettings, host: string): DoomDimmerSettings {
  const normalizedHost = normalizeHost(host);
  const nextPausedUntilByHost = { ...settings.pausedUntilByHost };
  delete nextPausedUntilByHost[normalizedHost];
  return { ...settings, pausedUntilByHost: nextPausedUntilByHost };
}
