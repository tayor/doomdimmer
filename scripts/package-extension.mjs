import { mkdir, rm } from "node:fs/promises";
import { basename } from "node:path";
import { spawn } from "node:child_process";

await mkdir("release", { recursive: true });
const artifact = "release/doomdimmer-extension.zip";
await rm(artifact, { force: true });

await new Promise((resolve, reject) => {
  const child = spawn("zip", ["-qr", `../${artifact}`, "."], { cwd: "dist", stdio: "inherit" });
  child.on("error", reject);
  child.on("exit", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`zip exited ${code}`))));
});

console.log(`Packaged ${basename(artifact)} in release/`);
