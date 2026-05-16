import "./styles.css";
import { byId, sendMessage, setText } from "./shared/browser";
import type { SensitivityPreset, SiteMode } from "./shared/types";

const form = byId<HTMLFormElement>("setupForm");
const phrase = byId<HTMLInputElement>("phrase");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void finish();
});

byId("resetPhrase").addEventListener("click", () => {
  phrase.value = "I am scrolling mindlessly";
});

byId("useDefaults").addEventListener("click", () => {
  phrase.value = "I am scrolling mindlessly";
  setRadio("preset", "balanced");
  setRadio("siteMode", "all_except_excluded");
  void finish();
});

async function finish(): Promise<void> {
  const preset = checkedValue("preset") as SensitivityPreset;
  const siteMode = checkedValue("siteMode") as SiteMode;
  const response = await sendMessage({
    type: "COMPLETE_ONBOARDING",
    settings: {
      preset,
      siteMode,
      prompt: {
        phrase: phrase.value.trim() || "I am scrolling mindlessly",
        caseSensitive: false,
        matchMode: "exact",
        buttonRestore: false
      }
    }
  });
  if (!response.ok) {
    setText("setupStatus", response.error ?? "Setup failed");
    return;
  }
  setText("setupStatus", "Setup complete");
  await chrome.runtime.openOptionsPage();
  window.close();
}

function checkedValue(name: string): string {
  return document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`)?.value ?? "";
}

function setRadio(name: string, value: string): void {
  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`));
  for (const input of inputs) {
    input.checked = input.value === value;
  }
}
