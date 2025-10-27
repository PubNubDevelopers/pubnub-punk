# Preferences Architecture (Simplified)

The legacy configuration-versioning system and `configService` have been retired. The application now relies solely on in-browser `localStorage` plus lightweight React context state.

## Global Settings
- Managed through `src/lib/storage.ts` (`storage.getSettings()` / `storage.saveSettings()`).
- Persisted under the `pubnub_developer_tools_settings` key.
- Updates propagate across tabs via the storage event listener in `src/contexts/pubnub-context.tsx`.

## Per-page Settings
- Pages that need UI state (for example the Pub/Sub tool) hydrate from `storage.getItem` on mount and write back via `storage.setItem`.
- The shared `useConfig` context provides an in-memory snapshot for the current page so components can exchange settings without additional persistence layers.

## Local Storage Keys in Use
- `pubnub_developer_tools_settings`
- `pubsub-config`
- `pubsub-publish-history`
- `pubnub_mobile_push_devices`

No other persistence helpers remain; there is no App Context/App Storage sync logic. When users need to reset the app, they can simply clear local storage for these keys.
