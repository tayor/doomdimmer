import "./styles.css";
import { byId, formatDuration, sendMessage, setText } from "./shared/browser";
import type { PopupState, SensitivityPreset } from "./shared/types";

const siteToggle = byId<HTMLInputElement>("siteToggle");
const presetInputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[name='preset']"));

void init();

async function init(): Promise<void> {
  await refresh();
  siteToggle.addEventListener("change", async () => {
    setText("saveStatus", "Saving...");
    const response = await sendMessage({ type: "SET_SITE_ENABLED", enabled: siteToggle.checked });
    setText("saveStatus", response.ok ? "Saved for this site" : response.error ?? "Unable to save");
    await refresh();
  });
  presetInputs.forEach((input) => {
    input.addEventListener("change", async () => {
      if (!input.checked) return;
      await sendMessage({ type: "SET_PRESET", preset: input.value as SensitivityPreset });
      setText("saveStatus", "Sensitivity saved");
      await refresh();
    });
  });
  byId("pause15").addEventListener("click", () => pause(15));
  byId("pause60").addEventListener("click", () => pause(60));
  byId("openSettings").addEventListener("click", () => sendMessage({ type: "OPEN_SETTINGS" }));
  byId("settingsButton").addEventListener("click", () => sendMessage({ type: "OPEN_SETTINGS" }));
}

async function refresh(): Promise<void> {
  const response = await sendMessage<PopupState>({ type: "GET_POPUP_STATE" });
  if (!response.ok || !response.data) {
    setText("siteHost", "Unavailable");
    setText("sessionStatus", "Unavailable");
    return;
  }
  render(response.data);
}

function render(state: PopupState): void {
  const host = state.host || "No normal page";
  setText("siteHost", host);
  setText("siteInitial", host.slice(0, 1).toUpperCase() || "D");
  siteToggle.checked = state.effective.enabled;
  setText("siteToggleLabel", state.effective.enabled ? "On" : "Off");
  const label = state.status.stage === "paused" ? `Paused ${formatDuration(state.status.pausedUntil)}` : titleCase(state.status.stage);
  setText("sessionStatus", label);
  presetInputs.forEach((input) => {
    input.checked = input.value === state.settings.preset;
  });
}

async function pause(minutes: number): Promise<void> {
  setText("saveStatus", "Pausing...");
  const response = await sendMessage({ type: "PAUSE_SITE", minutes });
  setText("saveStatus", response.ok ? `Paused for ${minutes === 60 ? "1 hour" : `${minutes} minutes`}` : response.error ?? "Pause failed");
  await refresh();
}

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
