# DoomDimmer

DoomDimmer is a free, open-source, local-first Chrome extension that interrupts mindless scrolling without blocking websites outright.

It watches for rapid, continuous passive scrolling in the browser, then gently fades the page toward grayscale and blur. If scrolling continues, DoomDimmer asks for a short reflection phrase before restoring the page.

## Privacy Model

- No account.
- No analytics.
- No server processing.
- No remote AI.
- No browsing activity upload.
- No page content collection.
- Settings and optional aggregate stats stay in `chrome.storage.local`.

## Features

- Local doomscroll detection based on scroll density, continuous duration, direction consistency, and time since meaningful engagement.
- Progressive grayscale and blur intervention.
- Reflection prompt restore flow.
- Popup controls for current-site toggle, sensitivity, and temporary pause.
- First-run onboarding.
- Settings page with presets, full custom thresholds, site rules, per-site overrides, prompt settings, case-sensitive or forgiving matching, visual effects, local stats, import/export, and reset.
- Wildcard site rules such as `*.reddit.com`.
- Optional local stats disabled by default, with aggregate summary and one-click clearing.
- GitHub Pages landing page and privacy policy.
- Chrome Web Store submission package in `chrome-store/`.

## Development

```bash
npm install
npm run dev
npm run build
npm run package
npm run verify:production
```

Load the unpacked extension from `dist/` in `chrome://extensions` after running `npm run build`.

The Chrome Web Store upload ZIP is created at:

```text
release/doomdimmer-extension.zip
```

## Verification

`npm run verify:production` runs:

- TypeScript typecheck.
- Unit tests.
- Extension build and ZIP packaging.
- Manifest, permission, page, package, and content-script checks.
- Required image dimension checks.
- Store/site documentation checks.
- Runtime privacy checks for network, sync storage, and analytics paths.

Manual compatibility findings are tracked in `verification/qa-report.md`.

## Public URLs

- Homepage: `https://tayor.github.io/doomdimmer/`
- Privacy policy: `https://tayor.github.io/doomdimmer/privacy.html`
- Support: `https://github.com/tayor/doomdimmer/issues`

## License

MIT
