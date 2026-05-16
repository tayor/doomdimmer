import { DEFAULT_SETTINGS } from "./shared/defaults";
import { clearPausedHost, effectiveSettings, normalizeHost, upsertSiteRule } from "./shared/siteRules";
import { clearStats, getSettings, getStats, recordIntervention, replaceSettings, resetSettings, saveSettings } from "./shared/storage";
import type { ContentStatus, DoomDimmerSettings, ExtensionRequest, ExtensionResponse, PopupState } from "./shared/types";

chrome.runtime.onInstalled.addListener(async (details) => {
  const settings = await getSettings();
  if (details.reason === "install" && !settings.onboardingComplete) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

chrome.runtime.onMessage.addListener((request: ExtensionRequest, _sender, sendResponse) => {
  handleMessage(request)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Unexpected extension error." }));
  return true;
});

async function handleMessage(request: ExtensionRequest): Promise<ExtensionResponse> {
  if (request.type === "GET_SETTINGS") return { ok: true, data: await getSettings() };
  if (request.type === "GET_STATS") return { ok: true, data: await getStats() };
  if (request.type === "SAVE_SETTINGS") return { ok: true, data: await saveSettings(request.patch) };
  if (request.type === "RESET_SETTINGS") return { ok: true, data: await resetSettings() };
  if (request.type === "CLEAR_STATS") {
    await clearStats();
    return { ok: true };
  }
  if (request.type === "COMPLETE_ONBOARDING") {
    const next = await saveSettings({ ...request.settings, onboardingComplete: true });
    return { ok: true, data: next };
  }
  if (request.type === "GET_POPUP_STATE") return getPopupState();
  if (request.type === "SET_SITE_ENABLED") return setSiteEnabled(request.enabled, request.host);
  if (request.type === "SET_PRESET") return { ok: true, data: await saveSettings({ preset: request.preset }) };
  if (request.type === "PAUSE_SITE") return pauseSite(request.minutes, request.host);
  if (request.type === "OPEN_SETTINGS") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("settings.html") });
    return { ok: true };
  }
  if (request.type === "OPEN_WELCOME") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
    return { ok: true };
  }
  if (request.type === "RECORD_INTERVENTION") {
    await recordIntervention(request.host, request.estimatedMinutesInterrupted);
    return { ok: true };
  }
  return { ok: false, error: "Unsupported request." };
}

async function getPopupState(): Promise<ExtensionResponse<PopupState>> {
  const settings = await getSettings();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = tab?.url ?? "";
  const host = tabUrl ? normalizeHost(tabUrl) : "";
  const effective = effectiveSettings(settings, host || "unknown");
  let status: ContentStatus = {
    stage: effective.enabled ? "normal" : "disabled",
    score: 0,
    host,
    enabled: effective.enabled,
    pausedUntil: effective.pausedUntil,
    cooldownUntil: 0,
    lastUpdated: Date.now()
  };
  if (tab?.id) {
    try {
      const response = await chrome.tabs.sendMessage<unknown, ExtensionResponse<ContentStatus>>(tab.id, { type: "DOOMDIMMER_GET_STATUS" });
      if (response?.ok && response.data) status = response.data;
    } catch {
      // Normal on browser-internal pages or pages that have not loaded the content script.
    }
  }
  return {
    ok: true,
    data: {
      tabTitle: tab?.title ?? "Current page",
      tabUrl,
      host,
      settings,
      effective,
      status
    }
  };
}

async function setSiteEnabled(enabled: boolean, requestedHost?: string): Promise<ExtensionResponse<DoomDimmerSettings>> {
  const host = requestedHost || (await currentHost());
  if (!host) return { ok: false, error: "No normal website is active." };
  let settings = await getSettings();
  if (enabled) settings = clearPausedHost(settings, host);
  settings = upsertSiteRule(settings, host, enabled);
  const next = await replaceSettings(settings);
  await notifyActiveTab({ type: "DOOMDIMMER_REFRESH_SETTINGS" });
  return { ok: true, data: next };
}

async function pauseSite(minutes: number, requestedHost?: string): Promise<ExtensionResponse<DoomDimmerSettings>> {
  const host = requestedHost || (await currentHost());
  if (!host) return { ok: false, error: "No normal website is active." };
  const settings = await getSettings();
  const pausedUntilByHost = { ...settings.pausedUntilByHost, [host]: Date.now() + minutes * 60_000 };
  const next = await saveSettings({ pausedUntilByHost });
  await notifyActiveTab({ type: "DOOMDIMMER_REFRESH_SETTINGS" });
  return { ok: true, data: next };
}

async function currentHost(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ? normalizeHost(tab.url) : "";
}

async function notifyActiveTab(message: object): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, message).catch(() => undefined);
}

void chrome.runtime.setUninstallURL("https://github.com/tayor/doomdimmer/issues");
void chrome.storage.local.get("doomdimmer.settings").then((result) => {
  if (!result["doomdimmer.settings"]) return chrome.storage.local.set({ "doomdimmer.settings": DEFAULT_SETTINGS });
  return undefined;
});
