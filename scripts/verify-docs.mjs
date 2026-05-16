import { readFile, stat } from "node:fs/promises";

const files = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "PRIVACY.md",
  "docs/detection-heuristic.md",
  "docs/permissions.md",
  "chrome-store/README.md",
  "chrome-store/listing.md",
  "chrome-store/permissions-justification.md",
  "chrome-store/privacy-practices.md",
  "chrome-store/privacy-policy.md",
  "chrome-store/review-notes.md",
  "chrome-store/submission-checklist.md",
  "site/index.html",
  "site/privacy.html",
  "site/styles.css",
  "verification/qa-report.md"
];

for (const file of files) await stat(file);

const listing = await readFile("chrome-store/listing.md", "utf8");
assert(listing.includes("DoomDimmer"), "listing must name DoomDimmer");
assert(listing.includes("https://tayor.github.io/doomdimmer/"), "listing must include homepage URL");
assert(listing.includes("https://tayor.github.io/doomdimmer/privacy.html"), "listing must include privacy URL");

const site = await readFile("site/index.html", "utf8");
assert(site.includes("Stop mindless scrolling without blocking the web"), "site must contain product headline");
assert(site.includes("privacy.html"), "site must link privacy policy");

console.log("Documentation verification passed: required release, store, and site files are present.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
