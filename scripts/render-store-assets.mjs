import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const sourceDir = resolve(root, "chrome-store/source");
const assetsDir = resolve(root, "chrome-store/assets");
const screenshotsDir = resolve(assetsDir, "screenshots");
await mkdir(sourceDir, { recursive: true });
await mkdir(screenshotsDir, { recursive: true });
await mkdir(resolve(root, "site"), { recursive: true });
await cp("src/icons/icon128.png", "site/icon128.png");
await cp("src/icons/logo.png", "site/logo.png");

const chrome = process.env.CHROME_BIN || "google-chrome";
const ffmpeg = process.env.FFMPEG_BIN || "ffmpeg";
const logo = fileUrl(resolve(root, "src/icons/logo.png"));

const baseCss = `
*{box-sizing:border-box}body{margin:0;overflow:hidden;background:#f8fafc;color:#111a2e;font-family:Avenir Next,Avenir,Segoe UI,Helvetica Neue,sans-serif;letter-spacing:0}svg{width:1.1em;height:1.1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.logo{border-radius:50%;box-shadow:0 16px 40px rgba(17,26,46,.22)}.browser{position:relative;width:100%;height:100%;background:linear-gradient(180deg,#f3f6fb 0,#fff 12%)}.bar{height:86px;background:linear-gradient(180deg,#e9edf3,#f7f8fb);border-bottom:1px solid #d9dee9}.dot{position:absolute;top:24px;width:16px;height:16px;border-radius:50%}.red{left:26px;background:#ff625f}.yellow{left:54px;background:#ffbd2e}.green{left:82px;background:#27c93f}.url{position:absolute;top:44px;left:142px;right:160px;height:42px;border-radius:22px;background:#fff;display:flex;align-items:center;padding-left:28px;color:#2d374d;font-size:18px;box-shadow:inset 0 0 0 1px #e1e5ee}.ext{position:absolute;right:74px;top:36px;width:44px;height:44px;border-radius:50%;background:url("${logo}") center/cover}.card{border:1px solid #d9dee9;border-radius:14px;background:rgba(255,255,255,.92);box-shadow:0 20px 60px rgba(17,26,46,.12)}.feed{position:absolute;left:230px;top:126px;width:590px}.post{height:178px;margin-bottom:22px;padding:28px}.avatar{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#7aa1bd,#f5e6c8);float:left;margin-right:20px}.line{height:14px;border-radius:999px;background:#dce2ee;margin:12px 0}.line.title{width:70%;height:22px;background:#1c2740}.line.short{width:48%}.side{position:absolute;right:72px;top:132px;width:275px;height:260px;padding:24px}.popup{position:absolute;right:98px;top:108px;width:430px;padding:24px 18px 18px}.brand{display:flex;align-items:center;gap:14px;margin-bottom:20px}.brand h1{font-size:29px;margin:0}.brand p{font-size:13px;color:#667085;margin:7px 0 0}.panel{border:1px solid #d9dee9;border-radius:12px;padding:16px;margin-bottom:14px;background:#fff}.label{color:#667085;margin:0 0 12px}.status{color:#4451d9;font-size:30px;font-weight:900;margin:0}.toggle{width:54px;height:30px;border-radius:999px;background:#199b8c;margin-left:auto;position:relative}.toggle:after{content:"";position:absolute;width:24px;height:24px;right:3px;top:3px;border-radius:50%;background:#fff}.seg{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #d9dee9;border-radius:10px;overflow:hidden}.seg span{height:44px;display:grid;place-items:center}.seg .on{background:#4451d9;color:#fff}.button{height:54px;border:1px solid #4451d9;border-radius:9px;display:grid;place-items:center;color:#4451d9;font-weight:800}.primary{background:#4451d9;color:#fff}.muted{color:#667085}.greenText{color:#0f9f8e}
`;

await writePage("promo-small.html", 440, 280, `
<main class="promo small"><img class="logo" src="${logo}" width="112" height="112"><section><h1>DoomDimmer</h1><p>Stop mindless scrolling without blocking the web.</p><span>Local-first Chrome extension</span></section></main>`,
`.promo{width:100vw;height:100vh;display:flex;align-items:center;gap:28px;padding:34px;background:linear-gradient(135deg,#f8fbff 0,#eef3ff 52%,#e8f6f3 100%)}h1{margin:0 0 8px;font-size:36px}p{margin:0 0 18px;font-size:20px;color:#4f596d;line-height:1.2}span{display:inline-flex;border-radius:999px;background:#e7f4f1;color:#08796e;padding:8px 12px;font-weight:800;font-size:13px}`);

await writePage("promo-marquee.html", 1400, 560, `
<main class="marquee"><section><img class="logo" src="${logo}" width="132" height="132"><h1>DoomDimmer</h1><p>Progressive friction for mindless scrolling. Local detection, gentle dimming, no account, no analytics.</p></section><div class="mock"><div></div></div></main>`,
`.marquee{width:100vw;height:100vh;display:grid;grid-template-columns:.82fr 1.18fr;align-items:center;gap:70px;padding:60px 92px;background:linear-gradient(135deg,#f9fbff,#eef3ff 48%,#e8f6f3)}h1{font-size:76px;margin:22px 0 14px;line-height:.95}p{font-size:29px;color:#4f596d;line-height:1.24;margin:0;max-width:610px}.mock{height:386px;border:1px solid #d9dee9;border-radius:26px;background:linear-gradient(90deg,#fff 0 54%,#162036 54%);box-shadow:0 34px 90px rgba(17,26,46,.18);position:relative}.mock:after{content:"";position:absolute;left:50%;top:50%;width:126px;height:126px;border-radius:50%;background:url("${logo}") center/cover;transform:translate(-50%,-50%);box-shadow:0 20px 60px rgba(0,0,0,.28)}`);

await writePage("screenshot-onboarding.html", 1280, 800, `
<main class="browser"><div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><div class="url">chrome-extension://doomdimmer/welcome</div><span class="ext"></span></div><section class="welcome"><div><div class="brand"><img class="logo" src="${logo}" width="62"><h1>DoomDimmer</h1></div><h2>Stop mindless scrolling without blocking the web.</h2><p>DoomDimmer detects rapid, continuous scrolling patterns locally in your browser and gently fades and blurs the page when scrolling looks automatic.</p><b>Your browsing activity never leaves your device.</b><div class="hero"></div></div><form class="setup card"><h3><span>1</span>Choose your intervention level</h3><div class="cards"><article>Gentle<small>Softer fade</small></article><article class="pick">Balanced<small>Recommended</small></article><article>Strict<small>Fewer loopholes</small></article><article>Custom<small>Fine-tune</small></article></div><h3><span>2</span>Where should DoomDimmer run?</h3><div class="row pick">All sites <small>Protect me everywhere I browse</small></div><div class="row">Common infinite-scroll sites</div><h3><span>3</span>Choose your restore phrase</h3><div class="input">I am scrolling mindlessly</div><button>Finish setup</button></form></section></main>`,
`.welcome{display:grid;grid-template-columns:.82fr 1.18fr;gap:60px;padding:42px 64px}.brand h1{font-size:30px}.welcome h2{font-size:48px;line-height:1.12;margin:50px 0 22px}.welcome p{font-size:21px;color:#4f596d;line-height:1.45}.welcome b{display:inline-block;border-radius:999px;background:#e7f4f1;color:#08796e;padding:8px 14px}.hero{width:370px;height:160px;margin-top:34px;border-radius:16px;background:linear-gradient(90deg,#fff 0 52%,#17243c 52%);box-shadow:0 20px 60px rgba(17,26,46,.16)}.setup{padding:30px}.setup h3{font-size:20px;display:flex;align-items:center;gap:14px}.setup h3 span{width:34px;height:34px;border-radius:50%;background:#eef0fb;display:grid;place-items:center}.cards{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d9dee9;border-radius:12px;overflow:hidden}.cards article{height:90px;display:grid;place-items:center;text-align:center;border-right:1px solid #d9dee9;font-weight:800}.cards small{display:block;color:#667085}.pick{outline:2px solid #4451d9;color:#4451d9}.row{height:58px;border:1px solid #d9dee9;border-radius:10px;margin:10px 0;padding:10px 16px;font-weight:800}.row small{display:block;color:#667085;font-weight:500}.input{height:52px;border:1px solid #d9dee9;border-radius:9px;padding:14px 16px;margin-bottom:20px}button{height:58px;width:100%;border:0;border-radius:9px;background:#4451d9;color:#fff;font-weight:900;font-size:18px}`);

await writePage("screenshot-popup.html", 1280, 800, `
<main class="browser"><div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><div class="url">examplefeed.com</div><span class="ext"></span></div><section class="feed"><article class="post card"><span class="avatar"></span><div class="line title"></div><div class="line"></div><div class="line short"></div></article><article class="post card"><span class="avatar"></span><div class="line title"></div><div class="line"></div><div class="line short"></div></article></section><aside class="side card"><div class="line title"></div><div class="line"></div><div class="line"></div></aside><section class="popup card"><div class="brand"><img class="logo" src="${logo}" width="54"><div><h1>DoomDimmer</h1><p>Runs locally. No browsing data leaves your device.</p></div></div><div class="panel"><p class="label">Current site</p><div style="display:flex;align-items:center;gap:12px"><b style="font-size:19px">reddit.com</b><span style="margin-left:auto;color:#0f9f8e;font-weight:900">On</span><span class="toggle"></span></div></div><div class="panel"><p class="label">Session status</p><p class="status">Watching</p></div><div class="panel"><p class="label">Sensitivity</p><div class="seg"><span>Gentle</span><span class="on">Balanced</span><span>Strict</span></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><span class="button">Pause 15 min</span><span class="button">Pause 1 hour</span></div><p class="greenText" style="text-align:center">Behavior-based, not site blocking</p></section></main>`, "");

await writePage("screenshot-reflection.html", 1280, 800, `
<main class="browser blurred"><div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><div class="url">examplefeed.com</div><span class="ext"></span></div><section class="feed"><article class="post card"><span class="avatar"></span><div class="line title"></div><div class="line"></div><div class="line short"></div></article><article class="post card"><span class="avatar"></span><div class="line title"></div><div class="line"></div><div class="line short"></div></article></section><aside class="side card"></aside><section class="reflect card"><div class="brand"><img class="logo" src="${logo}" width="54"><h1>DoomDimmer</h1></div><p class="chip">Reflection required</p><h2>Still scrolling?</h2><p class="muted">Take a moment to choose what happens next.</p><b>Type this to continue</b><p class="phrase">I am scrolling mindlessly</p><div class="field">I am scrolling mindlessly</div><div class="button primary">Restore page</div><div class="button">Pause for 15 minutes</div><p class="muted" style="text-align:center">All detection runs locally in your browser.</p></section></main>`,
`.blurred:before{content:"";position:absolute;inset:86px 0 0;backdrop-filter:grayscale(1) blur(6px);background:rgba(228,232,239,.45);z-index:3}.reflect{position:absolute;z-index:4;left:50%;top:52%;transform:translate(-50%,-50%);width:390px;padding:26px}.reflect h2{font-size:29px;margin:16px 0 8px}.chip,.phrase{display:inline-block;border-radius:8px;background:#eef0ff;color:#4451d9;padding:8px 12px;font-weight:800}.field{height:52px;border:1.5px solid #4451d9;border-radius:9px;padding:14px;margin:12px 0 14px;font-size:18px}.reflect .button{margin-top:12px}`);

await writePage("screenshot-settings.html", 1280, 800, `
<main class="browser"><div class="bar"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span><div class="url">chrome-extension://doomdimmer/settings.html</div><span class="ext"></span></div><section class="settingsShot"><aside><div class="brand"><img class="logo" src="${logo}" width="58"><div><h1>DoomDimmer</h1><p>Local-first settings</p></div></div><nav><b>General</b><span>Site rules</span><span>Visual effects</span><span>Reflection</span><span>Stats (local)</span></nav><div class="local card"><b>Your data stays local</b><p>All settings are stored only on this device.</p></div></aside><section class="grid"><article class="card full"><b>Global enable</b><span style="float:right;color:#4451d9">On</span></article><article class="card"><b>Sensitivity preset</b><div class="seg"><span>Gentle</span><span class="on">Balanced</span><span>Strict</span></div></article><article class="card"><b>Custom thresholds</b><div class="line"></div><div class="line"></div><div class="line short"></div></article><article class="card"><b>Reflection prompt</b><div class="input">I am scrolling mindlessly</div><p>Exact match ○ Forgiving match</p><p>☑ Case-sensitive option</p></article><article class="card"><b>Visual effects</b><div class="line"></div><div class="line short"></div></article><article class="card"><b>Local stats</b><div class="statsMini"><span>12</span><span>38 min</span><span>reddit.com</span></div></article><article class="card full"><b>Site rules</b><div class="rulesMini"><span>reddit.com</span><span>Include</span><span>Strict</span><span>Prompt, 5m cooldown</span><span>Edit</span></div><div class="rulesMini"><span>youtube.com</span><span>Exclude</span><span>Global</span><span>None</span><span>Edit</span></div></article></section></section></main>`,
`.settingsShot{display:grid;grid-template-columns:300px 1fr;height:714px}.settingsShot aside{border-right:1px solid #d9dee9;background:#fff;padding:28px}.settingsShot nav{display:grid;gap:12px;margin-top:20px}.settingsShot nav b,.settingsShot nav span{height:46px;border-radius:9px;display:flex;align-items:center;padding:0 16px}.settingsShot nav b{background:#eef1f8;color:#4451d9}.local{margin-top:190px;padding:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:24px}.grid .card{padding:18px}.full{grid-column:1/-1}.input{height:42px;border:1px solid #d9dee9;border-radius:9px;margin:10px 0;padding:10px}.line{height:12px;border-radius:999px;background:#dce2ee;margin:14px 0}.short{width:58%}.statsMini{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}.statsMini span{border:1px solid #eef0f4;border-radius:8px;padding:10px;text-align:center;font-weight:900}.rulesMini{display:grid;grid-template-columns:1fr .7fr .7fr 1.3fr .5fr;gap:8px;border-top:1px solid #eef0f4;padding:10px 0;color:#4f596d}`);

await screenshot("promo-small.html", "promo-small-440x280.png", 440, 280, assetsDir);
await screenshot("promo-marquee.html", "promo-marquee-1400x560.png", 1400, 560, assetsDir);
await fitActualScreenshot("01.png", "01-popup-1280x800.png");
await fitActualScreenshot("02.png", "02-onboarding-1280x800.png");
await fitActualScreenshot("03.png", "03-settings-1280x800.png");

console.log("Rendered Chrome Store assets.");

async function writePage(name, width, height, body, extraCss) {
  const html = `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=${width},initial-scale=1"><title>${name}</title><style>${baseCss}${extraCss}</style></head><body style="width:${width}px;height:${height}px">${body}</body></html>`;
  await writeFile(resolve(sourceDir, name), html);
}

async function screenshot(source, output, width, height, dir) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      `--screenshot=${resolve(dir, output)}`,
      fileUrl(resolve(sourceDir, source))
    ], { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolvePromise(undefined) : reject(new Error(`Chrome screenshot failed for ${source}: ${code}`))));
  });
}

async function fitActualScreenshot(source, output) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(ffmpeg, [
      "-y",
      "-i",
      resolve(screenshotsDir, source),
      "-vf",
      "scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2:color=0xF8FAFC,format=rgb24",
      resolve(screenshotsDir, output)
    ], { stdio: "ignore" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolvePromise(undefined) : reject(new Error(`Actual screenshot fit failed for ${source}: ${code}`))));
  });
}

function fileUrl(path) {
  return `file://${path}`;
}
