export type SensitivityPreset = "gentle" | "balanced" | "strict" | "custom";
export type SiteMode = "all_except_excluded" | "only_selected" | "common_infinite_scroll";
export type RuleMode = "include" | "exclude";
export type MatchMode = "exact" | "forgiving";
export type InterventionStage = "normal" | "watching" | "grayscale" | "blur" | "reflection" | "cooldown" | "paused" | "disabled";

export interface DetectionThresholds {
  minContinuousScrollMs: number;
  noEngagementMs: number;
  grayscaleStartMs: number;
  blurStartMs: number;
  reflectionStartMs: number;
  cooldownMs: number;
  scrollEventsPerWindow: number;
}

export interface VisualSettings {
  grayscaleMax: number;
  blurMaxPx: number;
  reducedMotion: boolean;
  disableBlur: boolean;
}

export interface PromptSettings {
  phrase: string;
  caseSensitive: boolean;
  matchMode: MatchMode;
  buttonRestore: boolean;
}

export interface SiteRule {
  id: string;
  pattern: string;
  mode: RuleMode;
  preset?: SensitivityPreset;
  thresholds?: Partial<DetectionThresholds>;
  promptPhrase?: string;
  cooldownMs?: number;
  grayscaleMax?: number;
  blurMaxPx?: number;
}

export interface LocalStatsDay {
  date: string;
  interventions: number;
  estimatedMinutesInterrupted: number;
  bySite: Record<string, number>;
  byHour: Record<string, number>;
}

export interface DoomDimmerSettings {
  version: number;
  onboardingComplete: boolean;
  enabled: boolean;
  siteMode: SiteMode;
  preset: SensitivityPreset;
  customThresholds: DetectionThresholds;
  visual: VisualSettings;
  prompt: PromptSettings;
  siteRules: SiteRule[];
  statsEnabled: boolean;
  commonSites: string[];
  pausedUntilByHost: Record<string, number>;
}

export interface EffectiveSiteSettings {
  enabled: boolean;
  host: string;
  pattern: string;
  preset: SensitivityPreset;
  thresholds: DetectionThresholds;
  visual: VisualSettings;
  prompt: PromptSettings;
  pausedUntil: number;
  reason?: string;
}

export interface ContentStatus {
  stage: InterventionStage;
  score: number;
  host: string;
  enabled: boolean;
  pausedUntil: number;
  cooldownUntil: number;
  lastUpdated: number;
}

export interface PopupState {
  tabTitle: string;
  tabUrl: string;
  host: string;
  settings: DoomDimmerSettings;
  effective: EffectiveSiteSettings;
  status: ContentStatus;
}

export type ExtensionRequest =
  | { type: "GET_SETTINGS" }
  | { type: "GET_STATS" }
  | { type: "SAVE_SETTINGS"; patch: Partial<DoomDimmerSettings> }
  | { type: "RESET_SETTINGS" }
  | { type: "CLEAR_STATS" }
  | { type: "COMPLETE_ONBOARDING"; settings: Partial<DoomDimmerSettings> }
  | { type: "GET_POPUP_STATE" }
  | { type: "SET_SITE_ENABLED"; enabled: boolean; host?: string }
  | { type: "SET_PRESET"; preset: SensitivityPreset }
  | { type: "PAUSE_SITE"; minutes: number; host?: string }
  | { type: "OPEN_SETTINGS" }
  | { type: "OPEN_WELCOME" }
  | { type: "RECORD_INTERVENTION"; host: string; estimatedMinutesInterrupted: number };

export interface ExtensionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
