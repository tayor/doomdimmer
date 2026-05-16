import { readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";

const requiredFiles = [
  "dist/manifest.json",
  "dist/popup.html",
  "dist/settings.html",
  "dist/welcome.html",
  "dist/assets/background.js",
  "dist/assets/content.js",
  "dist/assets/popup.js",
  "dist/assets/settings.js",
  "dist/assets/welcome.js",
  "release/doomdimmer-extension.zip"
];

for (const file of requiredFiles) await stat(file);

const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
assert(manifest.manifest_version === 3, "manifest must be MV3");
assert(manifest.name === "DoomDimmer", "manifest name mismatch");
assert(manifest.action.default_popup === "popup.html", "popup path mismatch");
assert(manifest.options_page === "settings.html", "settings path mismatch");
assert(manifest.background.service_worker === "assets/background.js", "background worker path mismatch");
assert(JSON.stringify(manifest.permissions) === JSON.stringify(["storage"]), "only storage permission should be requested");
assert(!manifest.permissions.includes("tabs"), "tabs permission should not be requested");
assert(!manifest.permissions.includes("scripting"), "scripting permission should not be requested");
assert(!manifest.permissions.includes("downloads"), "downloads permission should not be requested");
assert(JSON.stringify(manifest.host_permissions) === JSON.stringify(["http://*/*", "https://*/*"]), "host permissions must match all-site detection posture");

const contentScript = await readFile("dist/assets/content.js", "utf8");
const backgroundScript = await readFile("dist/assets/background.js", "utf8");
assert(!/^\s*import\s|\bimport\{/.test(contentScript), "content script must be a classic script without imports");
assert(!contentScript.includes("from\"./"), "content script must not depend on chunk imports");
assert(!/eval\s*\(/.test(contentScript + backgroundScript), "extension code must not use eval");
assert(!/https?:\/\/(?!github\.com\/tayor\/doomdimmer|tayor\.github\.io\/doomdimmer)/.test(contentScript + backgroundScript), "extension runtime code should not call external URLs");

for (const [name, html, ids] of [
  ["popup", await readFile("dist/popup.html", "utf8"), ["siteToggle", "sessionStatus", "pause15", "pause60", "openSettings"]],
  ["settings", await readFile("dist/settings.html", "utf8"), ["enabled", "phrase", "caseSensitive", "rulesBody", "statsEnabled", "clearStats", "exportSettings", "resetSettings"]],
  ["welcome", await readFile("dist/welcome.html", "utf8"), ["setupForm", "phrase", "useDefaults"]]
]) {
  for (const id of ids) assert(html.includes(`id="${id}"`), `${name} missing #${id}`);
  assert(/\/assets\/.+\.js/.test(html), `${name} missing built script reference`);
}

const zipList = await run("unzip", ["-l", "release/doomdimmer-extension.zip"]);
for (const file of ["manifest.json", "popup.html", "settings.html", "welcome.html", "assets/background.js", "assets/content.js", "icons/icon128.png"]) {
  assert(zipList.includes(file), `package missing ${file}`);
}

console.log("Build verification passed: manifest, permissions, pages, classic content script, and package contents are consistent.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve(stdout) : reject(new Error(stderr || `${command} exited ${code}`))));
  });
}
