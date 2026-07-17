# Quick Capture project context

## Structure

- `plugin/`: Obsidian desktop plugin source and release manifest.
- `worker/`: Cloudflare Worker and D1 encrypted queue.
- `scripts/`: deployment and release helpers.
- `.github/workflows/`: CI and signed release automation.

## Constraints

- The public plugin ID is `quick-capture`.
- The displayed developer name is `zhengxx`; the repository remains under `zhengxn1`.
- Root and plugin manifests must remain identical.
- The manifest description must not contain the word `Obsidian`.
- Existing local credentials and the personal `obsidian.nxus.top` deployment must remain private and compatible.

## Change log

- 2026-07-17: Prepared version 0.2.3 for community review. Unified manifests, removed the prohibited word from the description, added English documentation, generated release notes, and added GitHub artifact attestations.
- 2026-07-17: Prepared version 0.2.4. Replaced direct HTML heading elements in the settings tab with the official `Setting.setHeading()` API.
