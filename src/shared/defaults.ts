import type { DetectionThresholds, DoomDimmerSettings, PromptSettings, SensitivityPreset, VisualSettings } from "./types";

export const STORAGE_KEY = "doomdimmer.settings";
export const STATS_KEY = "doomdimmer.localStats";

export const DEFAULT_PROMPT = "I am scrolling mindlessly";

export const PRESET_THRESHOLDS: Record<Exclude<SensitivityPreset, "custom">, DetectionThresholds> = {
  gentle: {
    minContinuousScrollMs: 150_000,
    noEngagementMs: 120_000,
    grayscaleStartMs: 150_000,
    blurStartMs: 210_000,
    reflectionStartMs: 270_000,
    cooldownMs: 10 * 60_000,
    scrollEventsPerWindow: 10
  },
  balanced: {
    minContinuousScrollMs: 90_000,
    noEngagementMs: 75_000,
    grayscaleStartMs: 90_000,
    blurStartMs: 135_000,
    reflectionStartMs: 180_000,
    cooldownMs: 7 * 60_000,
    scrollEventsPerWindow: 14
  },
  strict: {
    minContinuousScrollMs: 45_000,
    noEngagementMs: 35_000,
    grayscaleStartMs: 45_000,
    blurStartMs: 75_000,
    reflectionStartMs: 105_000,
    cooldownMs: 5 * 60_000,
    scrollEventsPerWindow: 18
  }
};

export const DEFAULT_VISUAL: VisualSettings = {
  grayscaleMax: 1,
  blurMaxPx: 16,
  reducedMotion: false,
  disableBlur: false
};

export const DEFAULT_PROMPT_SETTINGS: PromptSettings = {
  phrase: DEFAULT_PROMPT,
  caseSensitive: false,
  matchMode: "exact",
  buttonRestore: false
};

export const COMMON_INFINITE_SCROLL_SITES = [
  "*.reddit.com",
  "reddit.com",
  "*.x.com",
  "x.com",
  "*.twitter.com",
  "twitter.com",
  "*.linkedin.com",
  "linkedin.com",
  "*.facebook.com",
  "facebook.com",
  "*.instagram.com",
  "instagram.com",
  "*.youtube.com",
  "youtube.com",
  "*.tiktok.com",
  "tiktok.com",
  "news.ycombinator.com",
  "*.pinterest.com",
  "pinterest.com",
  "*.threads.net",
  "threads.net",
  "*.bsky.app",
  "bsky.app"
];

export const DEFAULT_SETTINGS: DoomDimmerSettings = {
  version: 1,
  onboardingComplete: false,
  enabled: true,
  siteMode: "all_except_excluded",
  preset: "balanced",
  customThresholds: PRESET_THRESHOLDS.balanced,
  visual: DEFAULT_VISUAL,
  prompt: DEFAULT_PROMPT_SETTINGS,
  siteRules: [
    { id: "reddit-default", pattern: "reddit.com", mode: "include" },
    { id: "youtube-default", pattern: "youtube.com", mode: "include" },
    { id: "linkedin-default", pattern: "linkedin.com", mode: "include" }
  ],
  statsEnabled: false,
  commonSites: COMMON_INFINITE_SCROLL_SITES,
  pausedUntilByHost: {}
};
