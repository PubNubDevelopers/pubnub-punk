# PubNub Ultimate Ninja Kit

The PubNub Ultimate Ninja Kit is a Vite + React + TypeScript workbench for exploring and validating PubNub features. It provides a battery of feature-focused tools—Publish/Subscribe, Presence, File Sharing, Access Manager, Persistence, Channel Groups, and more—behind a single settings-aware shell so you can experiment with real PubNub keys without writing ad-hoc scripts.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development Commands](#development-commands)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contribution Guidelines](#contribution-guidelines)
- [Troubleshooting](#troubleshooting)

## Features

| Area | Highlights |
| --- | --- |
| **Global Settings** | Manage publish/subscribe keys, user ID, SDK version, PAM token, and environment options. Event Engine is enabled by default and can be toggled per session. |
| **Pub/Sub Tool** | Quick publish editor, live message stream, server-side filters, channel/group management, resend & copy helpers, history catch-up controls. |
| **Presence v2** | Real-time monitor with Here Now / Where Now, connection status, simulated users (legacy & Event Engine modes), state editor, bulk actions. |
| **File Sharing** | Drag-and-drop uploads, real-time file events, bulk delete/download, ZIP export, gallery preview, channel history. |
| **Access Manager** | Create, inspect, and revoke PAM tokens, with guided scopes for channels, groups, and UUIDs. |
| **Persistence** | Fetch message history with cursor controls, delete ranges, inspect payloads, export snippets. |
| **Channel Groups** | Create, edit, and delete groups; add/remove channels with batch operations and pager support. |
| **Test Connection** | One-stop diagnostics for the shared PubNub instance, including SDK version and Event Engine status. |

Additional utility pages (Stream Generator, Event Workflow, Functions) are stubbed and ready for future expansion.

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/pn_devtools.git
cd pn_devtools
npm install

# Launch the dev server
npm run dev

# Visit the app
# http://localhost:5173/
```

### Prerequisites

- Node.js ≥ 18.x (Node 16 is no longer tested).
- npm ≥ 8 (or compatible package manager).
- PubNub account with publish/subscribe keys.

### Sample Keys

For local QA you can use the shared test keys used throughout the repository:

```
Publish Key:   pub-c-17c0aef0-b03b-460f-8f93-69fa5d80034a
Subscribe Key: sub-c-f18d5abb-122f-4ca0-9031-64e002e0fad0
```

Enter keys on the **Settings** page after the app loads, or store them ahead of time by seeding localStorage with `pubnub_developer_tools_settings`.

## Configuration

1. Open the app and visit **Settings**.
2. Provide your publish, subscribe, and (optionally) PAM token.
3. Confirm the **Event Engine** toggle reflects your desired mode (defaults to **On**). Switching modes automatically restarts the shared PubNub instances.
4. Choose a JS SDK release from the manifest (auto-updates to the latest unless you explicitly select a version).

Configuration changes auto-save and propagate to every tool.

## Development Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server on <http://localhost:5173>. |
| `npm run build` | Production bundle to `dist/`. |
| `npm run preview` | Serve the production bundle locally. |
| `npm run check` | Type-check with `tsc`. |
| `npm test` | Run Vitest unit suites. (Playwright specs are archived and disabled by default.) |

## Testing

- **Type Safety:** `npm run check` must pass before shipping.
- **Vitest:** `npm test` runs JS/TS unit tests. Playwright E2E suites live under `tests/` but are intentionally dormant until revived.
- **Manual QA:** Toggle Event Engine on/off via Settings and re-run workflows (Pub/Sub publish, Presence simulation, File Sharing events, Access Manager token flows) to validate both transport paths.

## Project Structure

```
pn_devtools/
├─ src/
│  ├─ components/          # Shared UI, pubsub widgets, etc.
│  ├─ contexts/            # React context providers (PubNub, config)
│  ├─ hooks/               # Reusable hooks (usePubNub, useToast, ...)
│  ├─ lib/                 # Storage helpers, SDK loader, instance registry
│  ├─ pages/               # Feature pages (pubsub, presence, file-sharing...)
│  ├─ types/               # Shared TypeScript types
│  └─ App.tsx              # Routes & shell composition
├─ utils/                  # CLI helpers & integration scripts (Python)
├─ tests/                  # Legacy Playwright specs (currently inactive)
├─ architecture_docs/      # Design notes & feature plans
└─ README.md               # This guide
```

## Contribution Guidelines

- Follow the coding conventions already in place (TypeScript + React hooks).
- Use conventional commits (e.g., `feat(pubsub): add payload preview`).
- Document new configuration toggles in the README and UI where appropriate.
- When touching shared logic, run `npm run check` (required) and `npm test` (where applicable).
- Coordinate large UX changes by updating the relevant doc under `architecture_docs/`.

## Troubleshooting

| Issue | Resolution |
| --- | --- |
| **Stuck on Settings** | Ensure you have valid Pub/Sub keys; the app locks other routes until both are provided. |
| **No real-time updates** | Confirm Event Engine mode matches the scenario you expect; reload after toggling. Check console for PubNub warnings or network errors. |
| **Favicon 404** | Expected in dev. Safe to ignore. |
| **Deprecated config warnings** | SDK 10.2.0 emits messages about `logVerbosity`/`useRandomIVs`; they’re harmless and will be removed on future upgrades. |
| **Playwright errors** | End-to-end specs are archived. Stick to `npm run dev`, `npm run check`, and `npm test` unless you plan to revive the E2E suite. |

---

Happy streaming! If you run into issues or want to propose new tools, open an issue or pull request with reproduction steps, screenshots, and the commands you ran.
