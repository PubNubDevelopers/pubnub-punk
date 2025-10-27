# Local Storage Usage

The PubNub Developer Tools app relies exclusively on the browser's `window.localStorage` API for client-side persistence. No cookies or IndexedDB stores are used.

## Central Storage Helper (`src/lib/storage.ts`)

A small wrapper module centralizes common persistence tasks:

- **Key**: `pubnub_developer_tools_settings`
  - Stores `AppSettings` (PubNub credentials, environment options, SDK version, storage preferences, etc.).
  - `getSettings()` merges stored values with defaults and cleans deprecated fields.
  - `saveSettings()` writes the full settings object.
- **Generic helpers**: `getItem`, `setItem`, `removeItem`, `clearAll` expose JSON serialization helpers for other modules.
- **PAM helpers**: `isPamEnabled()` and `getPamToken()` read from the stored settings.

This module is the recommended interface for local storage. The PubNub context, Pub/Sub page, and other features call through it.

## PubNub Context (`src/contexts/pubnub-context.tsx`)

- Loads settings via `storage.getSettings()` when the provider mounts.
- `updateSettings()` persists changes via `storage.saveSettings()`.
- Adds a `storage` event listener so that updates in one tab propagate to others (listens specifically for the `pubnub_developer_tools_settings` key).

## Pub/Sub Tool (`src/components/pubsub/PubSubPageEnhanced.tsx`)

Uses the storage helper to persist UI state between sessions:

- **Keys** (see `STORAGE_KEYS` at the top of the file):
  - `pubsub-config`: full publish/subscribe form state and UI toggles.
  - `pubsub-publish-history`: last 30 publish attempts for quick recall.
  - (`pubsub-ui-state` is defined but currently unused.)
- On mount the page restores prior settings from local storage, falling back to defaults if parsing fails.
- A debounced saver writes updates whenever configuration changes.
- Reset/back to defaults removes the stored config/history via `storage.removeItem`.

## Mobile Push Tool (`src/pages/mobile-push.tsx`)

This page interacts with `localStorage` directly (without the helper) to remember simulated devices:

- **Key**: `pubnub_mobile_push_devices`
  - An array of device descriptors used in the push-testing UI.
  - Loaded on mount and re-written whenever `devices` changes.

## Other references

- `src/components/pubsub/PubSubPageEnhanced.tsx` also reads publish history from local storage on load.
- The `storage.clearAll()` helper only removes the primary settings key; other features remove their own keys as needed.

## Summary

| Area | Storage Mechanism | Keys | Notes |
|------|-------------------|------|-------|
| Global settings | `storage` helper | `pubnub_developer_tools_settings` | Holds credentials, environment, and storage preferences. |
| Pub/Sub tool | `storage` helper | `pubsub-config`, `pubsub-publish-history` | Persists form state and last publish history; auto-saves via debounce. |
| Mobile Push tool | direct `localStorage` | `pubnub_mobile_push_devices` | Caches simulated device tokens for UI convenience. |

No part of the app currently writes cookies. All persistence is handled via `window.localStorage` with JSON-serialized payloads.
