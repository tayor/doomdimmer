# Contributing

Thanks for improving DoomDimmer.

## Local Setup

```bash
npm install
npm run verify:production
```

## Contribution Guidelines

- Keep detection local-first.
- Do not add analytics, remote code, server processing, or sync storage.
- Keep settings in `chrome.storage.local` unless a future privacy review explicitly approves another storage mode.
- Add focused tests for detector, storage, prompt, site-rule, UI, or packaging behavior you change.
- Do not weaken tests, privacy checks, or accessibility paths to make a change pass.

## Pull Request Checklist

- `npm run verify:production` passes.
- The Chrome Web Store permission and privacy docs still match actual behavior.
- UI changes are checked against the mockups and remain keyboard accessible.
- Any new dependency has a clear license and no telemetry or remote-code behavior.
