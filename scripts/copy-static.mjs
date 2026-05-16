import { cp, mkdir, rm } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await cp("manifest.json", "dist/manifest.json");
await cp("src/icons", "dist/icons", { recursive: true });
for (const page of ["popup", "settings", "welcome"]) {
  await cp(`dist/src/${page}.html`, `dist/${page}.html`);
}
await rm("dist/src", { recursive: true, force: true });
