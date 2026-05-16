# Permissions

DoomDimmer requests the minimum permissions needed for automatic local behavior detection.

## `storage`

Used for local settings, site rules, restore phrase, pause/cooldown timestamps, onboarding status, and optional aggregate local stats.

Stats can be disabled or cleared independently from settings.

Storage uses `chrome.storage.local`. DoomDimmer does not use `chrome.storage.sync`.

## Host Permissions

```json
["http://*/*", "https://*/*"]
```

DoomDimmer needs access to normal websites so its content script can:

- Observe local scroll and engagement events.
- Apply reversible grayscale/blur overlay effects.
- Show the local reflection prompt.
- Respect per-site rules and pause state.

DoomDimmer does not request access to browser-internal pages and does not run on `chrome://`, `edge://`, `about://`, or extension pages.

## Not Requested

DoomDimmer does not request `tabs`, `scripting`, `downloads`, `clipboardRead`, `clipboardWrite`, or background network permissions.
