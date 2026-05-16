import "./styles.css";
import { DEFAULT_SETTINGS, PRESET_THRESHOLDS } from "./shared/defaults";
import { byId, sendMessage, setText } from "./shared/browser";
import type { DetectionThresholds, DoomDimmerSettings, LocalStatsDay, MatchMode, SensitivityPreset, SiteMode, SiteRule } from "./shared/types";

let settings: DoomDimmerSettings = DEFAULT_SETTINGS;
const thresholdDefs: Array<{ key: keyof DetectionThresholds; label: string; min: number; max: number; step: number; unit: string; divisor: number }> = [
  { key: "minContinuousScrollMs", label: "Continuous scroll duration", min: 15, max: 240, step: 5, unit: "sec", divisor: 1000 },
  { key: "noEngagementMs", label: "No-click / no-type window", min: 15, max: 180, step: 5, unit: "sec", divisor: 1000 },
  { key: "grayscaleStartMs", label: "Grayscale start", min: 15, max: 240, step: 5, unit: "sec", divisor: 1000 },
  { key: "blurStartMs", label: "Blur start", min: 30, max: 300, step: 5, unit: "sec", divisor: 1000 },
  { key: "reflectionStartMs", label: "Reflection required", min: 45, max: 420, step: 5, unit: "sec", divisor: 1000 },
  { key: "cooldownMs", label: "Cooldown after restore", min: 1, max: 30, step: 1, unit: "min", divisor: 60_000 },
  { key: "scrollEventsPerWindow", label: "Scroll density", min: 4, max: 40, step: 1, unit: "events", divisor: 1 }
];

void init();

async function init(): Promise<void> {
  renderThresholds();
  const response = await sendMessage<DoomDimmerSettings>({ type: "GET_SETTINGS" });
  settings = response.data ?? DEFAULT_SETTINGS;
  apply();
  await renderStats();
  bind();
  watchForExternalChanges();
}

function watchForExternalChanges(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes["doomdimmer.settings"]) {
      void syncSettingsFromStorage();
    }
  });
}

async function syncSettingsFromStorage(): Promise<void> {
  const response = await sendMessage<DoomDimmerSettings>({ type: "GET_SETTINGS" });
  if (!response.ok || !response.data) return;
  settings = response.data;
  apply();
  await renderStats();
}

function bind(): void {
  document.querySelectorAll<HTMLInputElement>("input[name='preset']").forEach((input) => {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      const preset = input.value as SensitivityPreset;
      if (preset === "custom") {
        void persist({ preset: "custom" });
        return;
      }
      void persist({ preset, customThresholds: { ...PRESET_THRESHOLDS[preset] } });
    });
  });
  document.querySelectorAll<HTMLInputElement>("input[name='siteMode']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) void persist({ siteMode: input.value as SiteMode });
    });
  });
  document.querySelectorAll<HTMLInputElement>("input[name='matchMode']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) void persist({ prompt: { ...settings.prompt, matchMode: input.value as MatchMode } });
    });
  });
  byId<HTMLInputElement>("enabled").addEventListener("change", (event) => {
    void persist({ enabled: (event.currentTarget as HTMLInputElement).checked });
  });
  byId<HTMLInputElement>("phrase").addEventListener("input", debounce(() => {
    void persist({ prompt: { ...settings.prompt, phrase: byId<HTMLInputElement>("phrase").value } });
  }, 180));
  byId<HTMLInputElement>("buttonRestore").addEventListener("change", (event) => {
    void persist({ prompt: { ...settings.prompt, buttonRestore: (event.currentTarget as HTMLInputElement).checked } });
  });
  byId<HTMLInputElement>("caseSensitive").addEventListener("change", (event) => {
    void persist({ prompt: { ...settings.prompt, caseSensitive: (event.currentTarget as HTMLInputElement).checked } });
  });
  byId<HTMLInputElement>("grayscale").addEventListener("input", () => {
    const grayscaleMax = Number(byId<HTMLInputElement>("grayscale").value) / 100;
    void persist({ visual: { ...settings.visual, grayscaleMax } });
  });
  byId<HTMLInputElement>("blur").addEventListener("input", () => {
    const blurMaxPx = Number(byId<HTMLInputElement>("blur").value);
    void persist({ visual: { ...settings.visual, blurMaxPx } });
  });
  byId<HTMLInputElement>("disableBlur").addEventListener("change", (event) => {
    void persist({ visual: { ...settings.visual, disableBlur: (event.currentTarget as HTMLInputElement).checked } });
  });
  byId<HTMLInputElement>("reducedMotion").addEventListener("change", (event) => {
    void persist({ visual: { ...settings.visual, reducedMotion: (event.currentTarget as HTMLInputElement).checked } });
  });
  byId<HTMLInputElement>("statsEnabled").addEventListener("change", (event) => {
    void persist({ statsEnabled: (event.currentTarget as HTMLInputElement).checked });
  });
  byId("clearStats").addEventListener("click", clearStats);
  byId("addRule").addEventListener("click", addRule);
  byId("exportSettings").addEventListener("click", exportSettings);
  byId("importSettings").addEventListener("click", () => byId<HTMLInputElement>("importFile").click());
  byId<HTMLInputElement>("importFile").addEventListener("change", importSettings);
  byId("resetSettings").addEventListener("click", resetSettings);
}

function renderThresholds(): void {
  const root = byId("thresholdControls");
  root.innerHTML = "";
  for (const item of thresholdDefs) {
    const row = document.createElement("div");
    row.className = "setting-row";
    row.innerHTML = `<label for="${item.key}">${item.label}</label><input id="${item.key}" type="range" min="${item.min}" max="${item.max}" step="${item.step}"><span id="${item.key}Value"></span>`;
    root.append(row);
    row.querySelector("input")?.addEventListener("input", () => {
      const input = byId<HTMLInputElement>(item.key);
      const value = Number(input.value) * item.divisor;
      void persist({ preset: "custom", customThresholds: normalizedThresholds({ ...settings.customThresholds, [item.key]: value }) });
    });
  }
}

function apply(): void {
  byId<HTMLInputElement>("enabled").checked = settings.enabled;
  setText("globalLabel", settings.enabled ? "On" : "Off");
  setRadio("preset", settings.preset);
  setRadio("siteMode", settings.siteMode);
  setRadio("matchMode", settings.prompt.matchMode);
  byId<HTMLInputElement>("phrase").value = settings.prompt.phrase;
  byId<HTMLInputElement>("buttonRestore").checked = settings.prompt.buttonRestore;
  byId<HTMLInputElement>("caseSensitive").checked = settings.prompt.caseSensitive;
  byId<HTMLInputElement>("grayscale").value = String(Math.round(settings.visual.grayscaleMax * 100));
  byId<HTMLInputElement>("blur").value = String(settings.visual.blurMaxPx);
  byId<HTMLInputElement>("disableBlur").checked = settings.visual.disableBlur;
  byId<HTMLInputElement>("reducedMotion").checked = settings.visual.reducedMotion;
  byId<HTMLInputElement>("statsEnabled").checked = settings.statsEnabled;
  setText("statsLabel", settings.statsEnabled ? "On" : "Off");
  setText("grayscaleValue", `${Math.round(settings.visual.grayscaleMax * 100)}%`);
  setText("blurValue", `${settings.visual.blurMaxPx}px`);
  for (const item of thresholdDefs) {
    const input = byId<HTMLInputElement>(item.key);
    input.value = String(Math.round(settings.customThresholds[item.key] / item.divisor));
    setText(`${item.key}Value`, `${input.value} ${item.unit}`);
  }
  renderRules();
}

async function persist(patch: Partial<DoomDimmerSettings>): Promise<void> {
  const response = await sendMessage<DoomDimmerSettings>({ type: "SAVE_SETTINGS", patch });
  if (response.ok && response.data) {
    settings = response.data;
    apply();
    await renderStats();
    setText("saveStatus", "Saved");
  } else {
    setText("saveStatus", response.error ?? "Save failed");
  }
}

function renderRules(): void {
  const body = byId<HTMLTableSectionElement>("rulesBody");
  body.innerHTML = "";
  for (const rule of settings.siteRules) {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${escapeHtml(rule.pattern)}</td><td>${rule.mode === "include" ? "Include" : "Exclude"}</td><td>${rule.preset ?? "Global"}</td><td>${formatOverrides(rule)}</td><td><div class="rule-actions"><button class="button" data-action="edit" type="button" style="min-height:34px">Edit</button><button class="button" data-action="toggle" type="button" style="min-height:34px">Toggle</button><button class="button danger" data-action="delete" type="button" style="min-height:34px">Delete</button></div></td>`;
    row.querySelector<HTMLButtonElement>("[data-action='edit']")?.addEventListener("click", () => editRule(rule));
    row.querySelector<HTMLButtonElement>("[data-action='toggle']")?.addEventListener("click", () => {
      updateRule({ ...rule, mode: rule.mode === "include" ? "exclude" : "include" });
    });
    row.querySelector<HTMLButtonElement>("[data-action='delete']")?.addEventListener("click", () => {
      void persist({ siteRules: settings.siteRules.filter((item) => item.id !== rule.id) });
    });
    body.append(row);
  }
}

function addRule(): void {
  const pattern = window.prompt("Site domain or wildcard, for example reddit.com or *.reddit.com");
  if (!pattern) return;
  const mode = window.prompt("Mode: include or exclude", "include")?.trim().toLowerCase() === "exclude" ? "exclude" : "include";
  const rule: SiteRule = { id: `${pattern}-${Date.now()}`, pattern: pattern.trim(), mode };
  void persist({ siteRules: [...settings.siteRules, rule] });
}

function updateRule(rule: SiteRule): void {
  void persist({ siteRules: settings.siteRules.map((item) => (item.id === rule.id ? rule : item)) });
}

function editRule(rule: SiteRule): void {
  const presetInput = window.prompt("Per-site preset: global, gentle, balanced, strict, or custom", rule.preset ?? "global")?.trim().toLowerCase();
  if (!presetInput) return;
  const preset = presetInput === "global" ? undefined : (["gentle", "balanced", "strict", "custom"].includes(presetInput) ? presetInput as SensitivityPreset : rule.preset);
  const promptPhrase = optionalPrompt("Per-site prompt phrase. Leave blank for global prompt.", rule.promptPhrase ?? "");
  const cooldown = optionalNumber("Per-site cooldown in minutes. Leave blank for preset/global.", rule.cooldownMs ? Math.round(rule.cooldownMs / 60_000) : undefined);
  const grayscale = optionalNumber("Per-site grayscale max percent. Leave blank for global.", rule.grayscaleMax !== undefined ? Math.round(rule.grayscaleMax * 100) : undefined);
  const blur = optionalNumber("Per-site blur max px. Leave blank for global.", rule.blurMaxPx);
  updateRule({
    ...rule,
    preset,
    promptPhrase: promptPhrase || undefined,
    cooldownMs: cooldown === undefined ? undefined : cooldown * 60_000,
    grayscaleMax: grayscale === undefined ? undefined : grayscale / 100,
    blurMaxPx: blur
  });
}

function exportSettings(): void {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "doomdimmer-settings.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importSettings(event: Event): Promise<void> {
  const file = (event.currentTarget as HTMLInputElement).files?.[0];
  if (!file) return;
  const parsed = JSON.parse(await file.text()) as Partial<DoomDimmerSettings>;
  await persist(parsed);
}

async function resetSettings(): Promise<void> {
  const response = await sendMessage<DoomDimmerSettings>({ type: "RESET_SETTINGS" });
  if (response.ok && response.data) {
    settings = response.data;
    apply();
    await renderStats();
    setText("saveStatus", "Defaults restored");
  }
}

async function renderStats(): Promise<void> {
  const response = await sendMessage<Record<string, LocalStatsDay>>({ type: "GET_STATS" });
  const stats = response.data ?? {};
  const totals = Object.values(stats).reduce(
    (acc, day) => {
      acc.interventions += day.interventions;
      acc.minutes += day.estimatedMinutesInterrupted;
      for (const [site, count] of Object.entries(day.bySite)) acc.bySite[site] = (acc.bySite[site] ?? 0) + count;
      return acc;
    },
    { interventions: 0, minutes: 0, bySite: {} as Record<string, number> }
  );
  const topSite = Object.entries(totals.bySite).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None";
  setText("statsInterventions", String(totals.interventions));
  setText("statsMinutes", `${totals.minutes} min`);
  setText("statsTopSite", topSite);
}

async function clearStats(): Promise<void> {
  const response = await sendMessage({ type: "CLEAR_STATS" });
  setText("saveStatus", response.ok ? "Local stats cleared" : response.error ?? "Could not clear stats");
  await renderStats();
}

function setRadio(name: string, value: string): void {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`));
  for (const input of inputs) {
    input.checked = input.value === value;
  }
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: number | undefined;
  return () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fn, ms);
  };
}

function normalizedThresholds(value: DetectionThresholds): DetectionThresholds {
  const next = { ...value };
  if (next.reflectionStartMs <= next.blurStartMs) next.reflectionStartMs = next.blurStartMs + 5_000;
  if (next.blurStartMs <= next.grayscaleStartMs) next.blurStartMs = next.grayscaleStartMs + 5_000;
  return next;
}

function optionalPrompt(label: string, current: string): string | undefined {
  const value = window.prompt(label, current);
  if (value === null) return current || undefined;
  return value.trim();
}

function optionalNumber(label: string, current?: number): number | undefined {
  const value = window.prompt(label, current === undefined ? "" : String(current));
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : current;
}

function formatOverrides(rule: SiteRule): string {
  const parts = [
    rule.promptPhrase ? "Prompt" : "",
    rule.cooldownMs ? `${Math.round(rule.cooldownMs / 60_000)}m cooldown` : "",
    rule.grayscaleMax !== undefined ? `${Math.round(rule.grayscaleMax * 100)}% gray` : "",
    rule.blurMaxPx !== undefined ? `${rule.blurMaxPx}px blur` : ""
  ].filter(Boolean);
  return parts.length ? parts.map(escapeHtml).join(", ") : "None";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] ?? char));
}
