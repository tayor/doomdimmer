type Stage = "normal" | "watching" | "grayscale" | "blur" | "reflection" | "cooldown" | "paused" | "disabled";

interface Thresholds {
  minContinuousScrollMs: number;
  noEngagementMs: number;
  grayscaleStartMs: number;
  blurStartMs: number;
  reflectionStartMs: number;
  cooldownMs: number;
  scrollEventsPerWindow: number;
}

interface Settings {
  enabled: boolean;
  siteMode: "all_except_excluded" | "only_selected" | "common_infinite_scroll";
  preset: "gentle" | "balanced" | "strict" | "custom";
  customThresholds: Thresholds;
  visual: { grayscaleMax: number; blurMaxPx: number; reducedMotion: boolean; disableBlur: boolean };
  prompt: { phrase: string; caseSensitive: boolean; matchMode: "exact" | "forgiving"; buttonRestore: boolean };
  siteRules: Array<{ id: string; pattern: string; mode: "include" | "exclude"; preset?: "gentle" | "balanced" | "strict" | "custom"; thresholds?: Partial<Thresholds>; promptPhrase?: string; cooldownMs?: number; grayscaleMax?: number; blurMaxPx?: number }>;
  commonSites: string[];
  pausedUntilByHost: Record<string, number>;
}

const STORAGE_KEY = "doomdimmer.settings";
const PRESETS: Record<"gentle" | "balanced" | "strict", Thresholds> = {
  gentle: { minContinuousScrollMs: 150_000, noEngagementMs: 120_000, grayscaleStartMs: 150_000, blurStartMs: 210_000, reflectionStartMs: 270_000, cooldownMs: 600_000, scrollEventsPerWindow: 10 },
  balanced: { minContinuousScrollMs: 90_000, noEngagementMs: 75_000, grayscaleStartMs: 90_000, blurStartMs: 135_000, reflectionStartMs: 180_000, cooldownMs: 420_000, scrollEventsPerWindow: 14 },
  strict: { minContinuousScrollMs: 45_000, noEngagementMs: 35_000, grayscaleStartMs: 45_000, blurStartMs: 75_000, reflectionStartMs: 105_000, cooldownMs: 300_000, scrollEventsPerWindow: 18 }
};
const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  siteMode: "all_except_excluded",
  preset: "balanced",
  customThresholds: PRESETS.balanced,
  visual: { grayscaleMax: 1, blurMaxPx: 16, reducedMotion: false, disableBlur: false },
  prompt: { phrase: "I am scrolling mindlessly", caseSensitive: false, matchMode: "exact", buttonRestore: false },
  siteRules: [],
  commonSites: ["*.reddit.com", "reddit.com", "*.x.com", "x.com", "*.twitter.com", "twitter.com", "*.linkedin.com", "linkedin.com", "*.facebook.com", "facebook.com", "*.instagram.com", "instagram.com", "*.youtube.com", "youtube.com", "*.tiktok.com", "tiktok.com", "news.ycombinator.com", "*.pinterest.com", "pinterest.com"],
  pausedUntilByHost: {}
};

const globalScope = window as Window & { __doomDimmerReady?: boolean };

if (!globalScope.__doomDimmerReady && isNormalPage()) {
  globalScope.__doomDimmerReady = true;
  void boot();
}

async function boot(): Promise<void> {
  let settings = await loadSettings();
  let effective = buildEffective(settings);
  const state = {
    stage: effective.enabled ? "normal" as Stage : "disabled" as Stage,
    score: 0,
    lastScrollAt: 0,
    lastEngagementAt: Date.now(),
    continuousStartAt: 0,
    cooldownUntil: 0,
    pageLoadedAt: Date.now(),
    lastY: window.scrollY,
    directions: [] as number[],
    scrollEvents: [] as Array<{ at: number; y: number }>,
    promptVisible: false,
    lastUrl: location.href
  };
  let lastTouchY: number | null = null;

  ensureStyle();

  const refresh = async (): Promise<void> => {
    settings = await loadSettings();
    effective = buildEffective(settings);
    if (!effective.enabled) {
      state.stage = effective.pausedUntil > Date.now() ? "paused" : "disabled";
      removeOverlay();
      return;
    }
    state.stage = "normal";
    state.promptVisible = false;
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEY]) void refresh();
  });

  chrome.runtime.onMessage.addListener((request: { type?: string }, _sender, sendResponse) => {
    if (request.type === "DOOMDIMMER_GET_STATUS") {
      sendResponse({ ok: true, data: status() });
      return true;
    }
    if (request.type === "DOOMDIMMER_REFRESH_SETTINGS") {
      void refresh().then(() => sendResponse({ ok: true }));
      return true;
    }
    return false;
  });

  const getScrollPosition = (event?: Event): number => {
    const target = event?.target;
    if (target instanceof Element) {
      return target.scrollTop;
    }
    const scrollingElement = document.scrollingElement;
    return scrollingElement ? scrollingElement.scrollTop : window.scrollY;
  };

  const getScrollDelta = (event?: Event): number | null => {
    if (!event) return null;
    if (event instanceof WheelEvent) return event.deltaY;
    if (event instanceof TouchEvent) {
      if (!event.touches.length) return null;
      const touchY = event.touches[0].clientY;
      if (lastTouchY === null) {
        lastTouchY = touchY;
        return null;
      }
      const delta = lastTouchY - touchY;
      lastTouchY = touchY;
      return delta;
    }
    return null;
  };

  const onScroll = throttle((event?: Event) => {
    const now = Date.now();
    if (!effective.enabled || document.hidden || withinProtectedContext() || now - state.pageLoadedAt < 2500 || now < state.cooldownUntil) {
      if (now < state.cooldownUntil) state.stage = "cooldown";
      applyEffects(0, 0, state.stage, effective, state);
      return;
    }
    const y = getScrollPosition(event);
    const eventDelta = getScrollDelta(event);
    const fallbackDelta = y - state.lastY;
    const delta = eventDelta === null ? fallbackDelta : (Math.abs(eventDelta) >= 1 ? eventDelta : fallbackDelta);
    const direction = Math.sign(delta);
    if (Math.abs(delta) < 1) return;
    if (!state.continuousStartAt || now - state.lastScrollAt > 2500) {
      state.continuousStartAt = now;
      state.directions = [];
      state.scrollEvents = [];
    }
    state.directions.push(direction);
    state.directions = state.directions.slice(-40);
    state.scrollEvents.push({ at: now, y });
    state.scrollEvents = state.scrollEvents.filter((event) => now - event.at <= 10_000);
    state.lastScrollAt = now;
    state.lastY = y;

    const continuous = now - state.continuousStartAt;
    const result = classify({
      continuousScrollMs: continuous,
      timeSinceEngagementMs: now - state.lastEngagementAt,
      scrollEventsInWindow: state.scrollEvents.length,
      directionConsistency: directionConsistency(state.directions),
      typing: isEditable(document.activeElement),
      hidden: document.hidden
    }, effective.thresholds);
    state.score = result.score;
    state.stage = result.stage;
    const progress = effectProgress(state.stage, continuous, effective.thresholds);
    applyEffects(progress.grayscale, progress.blur, state.stage, effective, state);
  }, 160);

  const onEngagement = (event: Event): void => {
    if (isInsideDoomDimmer(event.target)) return;
    state.lastEngagementAt = Date.now();
    state.continuousStartAt = 0;
    state.score = Math.max(0, state.score - 35);
    if (state.stage !== "reflection") {
      state.stage = effective.enabled ? "normal" : "disabled";
      removeOverlay();
    }
  };

  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("wheel", onScroll, { passive: true });
  window.addEventListener("touchmove", onScroll, { passive: true });
  window.addEventListener("touchstart", (event) => {
    if (event.touches.length > 0) lastTouchY = event.touches[0].clientY;
  }, { passive: true });
  window.addEventListener("touchend", () => {
    lastTouchY = null;
  }, { passive: true });
  window.addEventListener("touchcancel", () => {
    lastTouchY = null;
  }, { passive: true });
  window.addEventListener("click", onEngagement, true);
  window.addEventListener("pointerdown", onEngagement, true);
  window.addEventListener("keydown", onEngagement, true);
  window.addEventListener("input", onEngagement, true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      state.continuousStartAt = 0;
      state.stage = effective.enabled ? "normal" : "disabled";
      removeOverlay();
    }
  });

  window.setInterval(() => {
    if (location.href !== state.lastUrl) {
      state.lastUrl = location.href;
      state.pageLoadedAt = Date.now();
      state.lastEngagementAt = Date.now();
      state.continuousStartAt = 0;
      void refresh();
      removeOverlay();
    }
    if (state.stage === "cooldown" && Date.now() >= state.cooldownUntil) {
      state.stage = effective.enabled ? "normal" : "disabled";
      removeOverlay();
    }
  }, 1000);

  function status() {
    return {
      stage: state.stage,
      score: state.score,
      host: effective.host,
      enabled: effective.enabled,
      pausedUntil: effective.pausedUntil,
      cooldownUntil: state.cooldownUntil,
      lastUpdated: Date.now()
    };
  }
}

function isNormalPage(): boolean {
  return /^https?:$/.test(location.protocol);
}

async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] ?? {};
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    customThresholds: { ...DEFAULT_SETTINGS.customThresholds, ...(raw.customThresholds ?? {}) },
    visual: { ...DEFAULT_SETTINGS.visual, ...(raw.visual ?? {}) },
    prompt: { ...DEFAULT_SETTINGS.prompt, ...(raw.prompt ?? {}) },
    siteRules: Array.isArray(raw.siteRules) ? raw.siteRules : [],
    commonSites: Array.isArray(raw.commonSites) ? raw.commonSites : DEFAULT_SETTINGS.commonSites,
    pausedUntilByHost: raw.pausedUntilByHost ?? {}
  };
}

function buildEffective(settings: Settings) {
  const host = normalizeHost(location.hostname);
  const rule = settings.siteRules.find((item) => wildcardMatches(item.pattern, host) || wildcardMatches(`*.${item.pattern}`, host));
  let enabled = settings.enabled;
  if (enabled && settings.siteMode === "only_selected") enabled = rule?.mode === "include";
  if (enabled && settings.siteMode === "common_infinite_scroll") enabled = settings.commonSites.some((pattern) => wildcardMatches(pattern, host)) || rule?.mode === "include";
  if (enabled && rule?.mode === "exclude") enabled = false;
  const pausedUntil = settings.pausedUntilByHost[host] ?? 0;
  if (enabled && pausedUntil > Date.now()) enabled = false;
  const preset = rule?.preset ?? settings.preset;
  const thresholds = { ...(preset === "custom" ? settings.customThresholds : PRESETS[preset]), ...(rule?.thresholds ?? {}) };
  if (rule?.cooldownMs) thresholds.cooldownMs = rule.cooldownMs;
  return {
    enabled,
    host,
    pausedUntil,
    thresholds,
    visual: { ...settings.visual, grayscaleMax: rule?.grayscaleMax ?? settings.visual.grayscaleMax, blurMaxPx: rule?.blurMaxPx ?? settings.visual.blurMaxPx },
    prompt: { ...settings.prompt, phrase: rule?.promptPhrase ?? settings.prompt.phrase }
  };
}

function classify(input: { continuousScrollMs: number; timeSinceEngagementMs: number; scrollEventsInWindow: number; directionConsistency: number; typing: boolean; hidden: boolean }, thresholds: Thresholds): { score: number; stage: Stage } {
  if (input.hidden || input.typing) return { score: 0, stage: "normal" };
  const score = Math.round(Math.min(100,
    ratio(input.continuousScrollMs, thresholds.minContinuousScrollMs) * 35 +
    ratio(input.timeSinceEngagementMs, thresholds.noEngagementMs) * 30 +
    ratio(input.scrollEventsInWindow, thresholds.scrollEventsPerWindow) * 20 +
    input.directionConsistency * 15
  ));
  const denseEnough = input.scrollEventsInWindow >= Math.ceil(thresholds.scrollEventsPerWindow * 0.55);
  if (denseEnough && input.continuousScrollMs >= thresholds.reflectionStartMs && score >= 85) return { score, stage: "reflection" };
  if (denseEnough && input.continuousScrollMs >= thresholds.blurStartMs && score >= 72) return { score, stage: "blur" };
  if (denseEnough && input.continuousScrollMs >= thresholds.grayscaleStartMs && score >= 58) return { score, stage: "grayscale" };
  if (denseEnough && input.continuousScrollMs >= thresholds.minContinuousScrollMs && score >= 40) return { score, stage: "watching" };
  return { score, stage: "normal" };
}

function effectProgress(stage: Stage, continuous: number, thresholds: Thresholds): { grayscale: number; blur: number } {
  if (!["grayscale", "blur", "reflection"].includes(stage)) return { grayscale: 0, blur: 0 };
  const grayscale = clamp((continuous - thresholds.grayscaleStartMs) / Math.max(1, thresholds.blurStartMs - thresholds.grayscaleStartMs));
  const blur = stage === "grayscale" ? 0 : clamp((continuous - thresholds.blurStartMs) / Math.max(1, thresholds.reflectionStartMs - thresholds.blurStartMs));
  return { grayscale, blur };
}

function applyEffects(grayscaleProgress: number, blurProgress: number, stage: Stage, effective: ReturnType<typeof buildEffective>, state: { promptVisible: boolean; stage: Stage; cooldownUntil: number; continuousStartAt: number }): void {
  const grayscale = grayscaleProgress * effective.visual.grayscaleMax;
  const blur = effective.visual.disableBlur ? 0 : blurProgress * effective.visual.blurMaxPx;
  if (stage === "normal" || stage === "watching" || stage === "disabled" || stage === "paused" || stage === "cooldown") {
    state.promptVisible = false;
    removeOverlay();
    return;
  }
  const root = ensureOverlay();
  root.style.setProperty("--doomdimmer-gray", grayscale.toFixed(3));
  root.style.setProperty("--doomdimmer-blur", `${blur.toFixed(2)}px`);
  root.classList.toggle("doomdimmer-blocking", stage === "reflection");
  root.classList.toggle("doomdimmer-reduced-motion", effective.visual.reducedMotion);
  if (stage === "grayscale") {
    removePanel(root, state);
    renderNudge(root);
    return;
  }
  removeNudge(root);
  if (stage === "blur") {
    removePanel(root, state);
    return;
  }
  if (!state.promptVisible) {
    renderPanel(root, effective, state);
    state.promptVisible = true;
  }
}

function renderNudge(root: HTMLElement): void {
  if (root.querySelector(".doomdimmer-nudge")) return;
  const nudge = document.createElement("aside");
  nudge.className = "doomdimmer-nudge";
  nudge.setAttribute("role", "status");
  nudge.textContent = "Still scrolling?";
  root.append(nudge);
}

function removeNudge(root = document.getElementById("doomdimmer-root")): void {
  root?.querySelector(".doomdimmer-nudge")?.remove();
}

function removePanel(root: HTMLElement, state: { promptVisible: boolean }): void {
  root.querySelector(".doomdimmer-panel")?.remove();
  state.promptVisible = false;
}

function renderPanel(root: HTMLElement, effective: ReturnType<typeof buildEffective>, state: { promptVisible: boolean; stage: Stage; cooldownUntil: number; continuousStartAt: number }): void {
  const panel = document.createElement("section");
  panel.className = "doomdimmer-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "doomdimmer-title");
  const phrase = escapeHtml(effective.prompt.phrase);
  panel.innerHTML = `
    <div class="doomdimmer-brand"><span class="doomdimmer-logo" aria-hidden="true"></span><strong>DoomDimmer</strong><button class="doomdimmer-icon" type="button" aria-label="Open DoomDimmer settings">⚙</button></div>
    <p class="doomdimmer-chip">Reflection required</p>
    <h2 id="doomdimmer-title">Still scrolling?</h2>
    <p class="doomdimmer-copy">Take a moment to choose what happens next.</p>
    <label class="doomdimmer-label" for="doomdimmer-input">Type this to continue</label>
    <p class="doomdimmer-phrase">${phrase}</p>
    <input id="doomdimmer-input" class="doomdimmer-input" autocomplete="off" spellcheck="false">
    <p class="doomdimmer-error" aria-live="polite"></p>
    <button class="doomdimmer-restore" type="button">Restore page</button>
    <button class="doomdimmer-pause" type="button">Pause for 15 minutes</button>
    <p class="doomdimmer-local">All detection runs locally in your browser.</p>
  `;
  root.append(panel);
  const input = panel.querySelector<HTMLInputElement>(".doomdimmer-input");
  const error = panel.querySelector<HTMLElement>(".doomdimmer-error");
  const restore = panel.querySelector<HTMLButtonElement>(".doomdimmer-restore");
  const pause = panel.querySelector<HTMLButtonElement>(".doomdimmer-pause");
  const settingsButton = panel.querySelector<HTMLButtonElement>(".doomdimmer-icon");

  if (effective.prompt.buttonRestore) {
    input?.setAttribute("aria-disabled", "true");
    input?.classList.add("doomdimmer-hidden-control");
  }

  const restorePage = (): void => {
    const typed = input?.value ?? "";
    if (!effective.prompt.buttonRestore && !phraseMatches(typed, effective.prompt)) {
      if (error) error.textContent = "That phrase does not match yet.";
      input?.focus();
      return;
    }
    state.cooldownUntil = Date.now() + effective.thresholds.cooldownMs;
    state.stage = "cooldown";
    state.continuousStartAt = 0;
    state.promptVisible = false;
    removeOverlay();
    void chrome.runtime.sendMessage({ type: "RECORD_INTERVENTION", host: effective.host, estimatedMinutesInterrupted: Math.max(1, Math.round(effective.thresholds.reflectionStartMs / 60_000)) }).catch(() => undefined);
  };

  restore?.addEventListener("click", restorePage);
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") restorePage();
  });
  pause?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({ type: "PAUSE_SITE", minutes: 15, host: effective.host });
    state.stage = "paused";
    state.promptVisible = false;
    removeOverlay();
  });
  settingsButton?.addEventListener("click", () => void chrome.runtime.sendMessage({ type: "OPEN_SETTINGS" }));
  window.setTimeout(() => input?.focus(), 80);
}

function ensureStyle(): void {
  if (document.getElementById("doomdimmer-style")) return;
  const style = document.createElement("style");
  style.id = "doomdimmer-style";
  style.textContent = `
    #doomdimmer-root{--doomdimmer-gray:0;--doomdimmer-blur:0px;position:fixed;inset:0;z-index:2147483646;pointer-events:none;backdrop-filter:grayscale(var(--doomdimmer-gray)) blur(var(--doomdimmer-blur));-webkit-backdrop-filter:grayscale(var(--doomdimmer-gray)) blur(var(--doomdimmer-blur));background:rgba(245,248,252,.03);transition:backdrop-filter 12s linear,-webkit-backdrop-filter 12s linear,background 12s linear;font-family:Avenir Next,Avenir,Segoe UI,Helvetica Neue,sans-serif;color:#111a2e}
    #doomdimmer-root.doomdimmer-reduced-motion{transition:none}
    #doomdimmer-root.doomdimmer-blocking{pointer-events:auto;background:rgba(226,231,239,.43)}
    .doomdimmer-nudge{position:fixed;right:24px;bottom:24px;border:1px solid rgba(171,181,203,.7);border-radius:12px;background:rgba(255,255,255,.92);box-shadow:0 16px 44px rgba(15,23,42,.16);padding:13px 16px;color:#4451d9;font-weight:900}
    .doomdimmer-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(390px,calc(100vw - 32px));border:1px solid rgba(171,181,203,.72);border-radius:18px;background:rgba(255,255,255,.94);box-shadow:0 26px 90px rgba(15,23,42,.22);padding:24px 26px;pointer-events:auto}
    .doomdimmer-brand{display:flex;align-items:center;gap:14px;margin-bottom:20px}.doomdimmer-brand strong{font-size:28px}.doomdimmer-logo{width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 50% 70%,#c8e7f3 0 4px,#78a9bf 5px 8px,transparent 9px),linear-gradient(180deg,#07162b,#0c2941);box-shadow:inset 0 0 0 2px rgba(255,255,255,.12)}.doomdimmer-icon{margin-left:auto;border:0;background:transparent;color:#657084;font-size:18px;cursor:pointer}.doomdimmer-chip{display:inline-flex;margin:0 0 22px;border-radius:8px;background:#eef0ff;color:#374bd6;padding:8px 12px;font-weight:700}.doomdimmer-panel h2{margin:0 0 8px;font-size:28px;line-height:1.1}.doomdimmer-copy{margin:0 0 22px;color:#596378}.doomdimmer-label{display:block;margin-bottom:8px;font-size:13px;font-weight:800}.doomdimmer-phrase{display:inline-block;margin:0 0 12px;border:1px solid #d5daf0;border-radius:8px;background:#f4f6ff;color:#3649d8;padding:8px 12px}.doomdimmer-input{width:100%;height:52px;border:1.5px solid #3e50dc;border-radius:9px;padding:0 12px;font:inherit;font-size:18px;outline:none}.doomdimmer-input:focus{box-shadow:0 0 0 3px rgba(62,80,220,.15)}.doomdimmer-error{min-height:20px;margin:8px 0 0;color:#b42318;font-size:13px}.doomdimmer-restore,.doomdimmer-pause{width:100%;height:52px;border-radius:9px;font:inherit;font-weight:800;cursor:pointer}.doomdimmer-restore{border:0;background:#4451d9;color:white}.doomdimmer-pause{margin-top:12px;border:1px solid #4054de;background:#fff;color:#4054de}.doomdimmer-local{margin:18px 0 0;border-top:1px solid #e4e7ef;padding-top:16px;color:#667085;font-size:13px;text-align:center}.doomdimmer-hidden-control{position:absolute;opacity:0;pointer-events:none}
    @media (prefers-reduced-motion:reduce){#doomdimmer-root{transition:none}.doomdimmer-panel{transform:translate(-50%,-50%)}}
  `;
  document.documentElement.append(style);
}

function ensureOverlay(): HTMLElement {
  let root = document.getElementById("doomdimmer-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "doomdimmer-root";
    root.setAttribute("aria-live", "polite");
    document.documentElement.append(root);
  }
  return root;
}

function removeOverlay(): void {
  document.getElementById("doomdimmer-root")?.remove();
}

function withinProtectedContext(): boolean {
  if (/checkout|payment|billing|login|signin|signup|account/i.test(location.href)) return true;
  return isEditable(document.activeElement);
}

function isEditable(target: EventTarget | Element | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable || ["input", "textarea", "select"].includes(tag) || target.getAttribute("role") === "textbox";
}

function isInsideDoomDimmer(target: EventTarget | null): boolean {
  return target instanceof Node && Boolean(document.getElementById("doomdimmer-root")?.contains(target));
}

function directionConsistency(directions: number[]): number {
  if (!directions.length) return 0;
  const down = directions.filter((value) => value > 0).length;
  const up = directions.filter((value) => value < 0).length;
  return Math.max(down, up) / directions.length;
}

function ratio(value: number, target: number): number {
  return Math.max(0, Math.min(1, value / Math.max(1, target)));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeHost(host: string): string {
  return host.replace(/^www\./, "").toLowerCase();
}

function wildcardMatches(pattern: string, host: string): boolean {
  const normalized = normalizeHost(pattern).replace(/\./g, "\\.").replace(/\*/g, "[^.]+");
  return new RegExp(`^${normalized}$`, "i").test(normalizeHost(host));
}

function phraseMatches(input: string, settings: { phrase: string; caseSensitive: boolean; matchMode: "exact" | "forgiving" }): boolean {
  const actual = normalizePhrase(input, settings.caseSensitive);
  const expected = normalizePhrase(settings.phrase, settings.caseSensitive);
  if (settings.matchMode === "exact") return actual === expected;
  return levenshtein(actual, expected) <= Math.max(1, Math.floor(expected.length * 0.12));
}

function normalizePhrase(value: string, caseSensitive: boolean): string {
  const next = value.replace(/\s+/g, " ").trim();
  return caseSensitive ? next : next.toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function throttle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  let timer: number | undefined;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    window.clearTimeout(timer);
    if (now - last >= ms) {
      last = now;
      fn(...args);
      return;
    }
    timer = window.setTimeout(() => {
      last = Date.now();
      fn(...args);
    }, ms - (now - last));
  }) as T;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char] ?? char));
}
