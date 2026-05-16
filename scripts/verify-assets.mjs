import { stat, readFile } from "node:fs/promises";
import { PNG } from "pngjs";

const pngs = {
  "src/icons/icon16.png": [16, 16],
  "src/icons/icon32.png": [32, 32],
  "src/icons/icon48.png": [48, 48],
  "src/icons/icon128.png": [128, 128],
  "src/icons/logo.png": [512, 512],
  "chrome-store/assets/promo-small-440x280.png": [440, 280],
  "chrome-store/assets/promo-marquee-1400x560.png": [1400, 560],
  "chrome-store/assets/screenshots/01-popup-1280x800.png": [1280, 800],
  "chrome-store/assets/screenshots/02-onboarding-1280x800.png": [1280, 800],
  "chrome-store/assets/screenshots/03-settings-1280x800.png": [1280, 800]
};

const transparentPngs = new Set([
  "src/icons/icon16.png",
  "src/icons/icon32.png",
  "src/icons/icon48.png",
  "src/icons/icon128.png",
  "src/icons/logo.png",
  "site/icon128.png",
  "site/logo.png"
]);

for (const [file, [width, height]] of Object.entries(pngs)) {
  await stat(file);
  const png = PNG.sync.read(await readFile(file));
  assert(png.width === width && png.height === height, `${file} must be ${width}x${height}, got ${png.width}x${png.height}`);

  if (transparentPngs.has(file)) {
    let hasTransparentPixel = false;
    let hasOpaquePixel = false;
    for (let index = 3; index < png.data.length; index += 4) {
      const alpha = png.data[index];
      hasTransparentPixel ||= alpha === 0;
      hasOpaquePixel ||= alpha === 255;
    }
    assert(hasTransparentPixel, `${file} must include transparent pixels`);
    assert(hasOpaquePixel, `${file} must include opaque pixels`);
  }
}

console.log("Asset verification passed: icon transparency and asset dimensions are correct.");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
