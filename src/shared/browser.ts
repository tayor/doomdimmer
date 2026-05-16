import type { ExtensionRequest, ExtensionResponse } from "./types";

export function sendMessage<T>(request: ExtensionRequest): Promise<ExtensionResponse<T>> {
  return chrome.runtime.sendMessage(request);
}

export function formatDuration(until: number): string {
  const remaining = Math.max(0, until - Date.now());
  if (!remaining) return "now";
  const minutes = Math.ceil(remaining / 60_000);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.ceil(minutes / 60)} hr`;
}

export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
}

export function setText(id: string, value: string): void {
  byId(id).textContent = value;
}
