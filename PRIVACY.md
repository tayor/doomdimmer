# Privacy Policy

Last updated: May 16, 2026

DoomDimmer is a local-first browser extension that helps interrupt mindless scrolling.

## Data Handling

DoomDimmer runs detection locally in your browser. It observes browser events needed to classify scrolling behavior, such as scroll timing, scroll density, tab visibility, focus, and recent engagement events.

DoomDimmer does not sell, share, or transmit your browsing activity, page content, scroll behavior, settings, or optional local stats to the developer or to third parties.

## Data Stored Locally

DoomDimmer may store the following data in `chrome.storage.local`:

- Extension settings.
- Site rules and wildcard patterns.
- Restore phrase.
- Pause and cooldown timestamps per site.
- Optional aggregate intervention counts if local stats are enabled.

Local stats are disabled by default. When enabled, stats contain aggregate counts by day, hour, and site host. DoomDimmer does not store raw scroll logs, page text, typed page content, or browsing history.

Local stats can be cleared from the settings page without uninstalling the extension.

## Network Use

No analytics. No external API calls. No server processing. No remote AI. DoomDimmer does not transmit detection data, page content, settings, or optional local stats to a remote service.

## Reflection Prompt

The restore phrase is matched locally inside the browser. DoomDimmer does not send the phrase, prompt input, keystrokes, or page content to any server.

## Permissions

DoomDimmer requests `storage` and access to normal `http://` and `https://` sites. Site access is needed so the content script can automatically detect scrolling behavior and apply reversible visual effects on pages where DoomDimmer is enabled.

## Advertising and Sale of Data

DoomDimmer does not serve advertising. It does not use, transfer, or sell user data for personalized ads, retargeting, interest-based advertising, credit decisions, or data broker services.

## Limited Use Statement

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Contact

For support or privacy questions, use GitHub issues:

```text
https://github.com/tayor/doomdimmer/issues
```
