import { readFile } from "node:fs/promises";

const runtime = [
  await readFile("src/background.ts", "utf8"),
  await readFile("src/content.ts", "utf8"),
  await readFile("src/popup.ts", "utf8"),
  await readFile("src/settings.ts", "utf8"),
  await readFile("src/welcome.ts", "utf8")
].join("\n");

assert(!runtime.includes("fetch("), "runtime must not call fetch");
assert(!runtime.includes("XMLHttpRequest"), "runtime must not use XMLHttpRequest");
assert(!runtime.includes("chrome.storage.sync"), "runtime must not use chrome.storage.sync");
assert(!runtime.includes("analytics"), "runtime must not include analytics code");
assert(!runtime.includes("innerText = document.body"), "runtime must not collect page text");

const policy = await readFile("PRIVACY.md", "utf8");
for (const phrase of [
  "does not sell",
  "does not transmit",
  "Limited Use",
  "chrome.storage.local",
  "No analytics"
]) {
  assert(policy.includes(phrase), `privacy policy missing ${phrase}`);
}

console.log("Privacy verification passed: no network/sync/analytics runtime paths and required policy statements are present.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
