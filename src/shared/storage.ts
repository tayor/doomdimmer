import { DEFAULT_SETTINGS, STATS_KEY, STORAGE_KEY } from "./defaults";
import { mergeSettings } from "./siteRules";
import type { DoomDimmerSettings, LocalStatsDay } from "./types";

export async function getSettings(): Promise<DoomDimmerSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return mergeSettings(result[STORAGE_KEY] ?? DEFAULT_SETTINGS);
}

export async function saveSettings(patch: Partial<DoomDimmerSettings>): Promise<DoomDimmerSettings> {
  const next = mergeSettings({ ...(await getSettings()), ...patch });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function replaceSettings(settings: Partial<DoomDimmerSettings>): Promise<DoomDimmerSettings> {
  const next = mergeSettings(settings);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function resetSettings(): Promise<DoomDimmerSettings> {
  await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
  await chrome.storage.local.remove(STATS_KEY);
  return DEFAULT_SETTINGS;
}

export async function recordIntervention(host: string, estimatedMinutesInterrupted: number): Promise<void> {
  const settings = await getSettings();
  if (!settings.statsEnabled) return;
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  const hour = String(today.getHours()).padStart(2, "0");
  const result = await chrome.storage.local.get(STATS_KEY);
  const stats: Record<string, LocalStatsDay> = result[STATS_KEY] ?? {};
  const current = stats[date] ?? { date, interventions: 0, estimatedMinutesInterrupted: 0, bySite: {}, byHour: {} };
  current.interventions += 1;
  current.estimatedMinutesInterrupted += estimatedMinutesInterrupted;
  current.bySite[host] = (current.bySite[host] ?? 0) + 1;
  current.byHour[hour] = (current.byHour[hour] ?? 0) + 1;
  stats[date] = current;
  await chrome.storage.local.set({ [STATS_KEY]: stats });
}

export async function getStats(): Promise<Record<string, LocalStatsDay>> {
  const result = await chrome.storage.local.get(STATS_KEY);
  return result[STATS_KEY] ?? {};
}

export async function clearStats(): Promise<void> {
  await chrome.storage.local.remove(STATS_KEY);
}
