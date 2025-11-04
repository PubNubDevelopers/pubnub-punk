# Event Engine Toggle Implementation Plan

This document outlines the changes required to let the UI run the PubNub SDK with either the legacy transport or the Event Engine transport. The goal is to add a single toggle in Settings and propagate the chosen value through every `src/` consumer so that **all** runtime interactions (shared hooks, context, feature pages) can operate when `enableEventEngine` is `true` *or* `false`.

## 1. Data Model & Storage

**Status:** Completed (Phase 1 implemented on-code).

**Notes:**
- `EnvironmentSettings` now includes `enableEventEngine: boolean` (defaulting to `false`).
- `storage.getSettings/saveSettings` patches legacy localStorage payloads and persists the flag.
- `PubNubConfig`, `InstanceRegistry`, and `createPubNubConfig` now carry the flag plus change-detection / hashing logic considers it.


1. **Extend the settings types**
   - File: `src/types/settings.ts`
   - Add `enableEventEngine: boolean` on `EnvironmentSettings`.
   - Update any helper types that depend on the environment shape.

2. **Include the flag everywhere AppSettings is materialised**
   - File: `src/lib/storage.ts`
     - Add `enableEventEngine: false` to `DEFAULT_SETTINGS.environment`.
     - When loading existing settings, default the field to `false` if missing to keep older localStorage payloads valid.
   - File: `src/types/pubnub.ts`
     - Extend `PubNubConfig` with optional `enableEventEngine?: boolean` so the config helper can forward it.

3. **Update helpers that derive configuration hashes**
   - File: `src/lib/instance-registry.ts`
     - Include the new flag in both `hasSettingsChanged` and `generateKey` so toggling the mode forces reconnection.
   - File: `src/utils/pubnub-config.ts`
     - Spread `settings.environment.enableEventEngine` into `createPubNubConfig`.
     - Update `areConfigsEquivalent`, `extractConnectionSettings`, and any display helpers to be aware of the flag.

4. **Confirm downstream helpers compile**
   - Files importing `AppSettings` or `PubNubConfig` (e.g. `src/utils/pubnub-config.ts`, `src/hooks/usePubNub.ts`, `src/contexts/pubnub-context.tsx`) will immediately require updates once the type changes, so keep the compiler running while you work.

## 2. Settings Page & Forms

**Status:** Completed.

**Notes:**
- Settings schema/defaults now expose `eventEngineEnabled` and hydrate form defaults from `environment.enableEventEngine`.
- Environment card shows a toggle (Switch) with guidance copy; auto-save persists the flag to AppSettings/context.

1. **Schema & defaults**
   - File: `src/pages/settings.tsx`
     - Extend the Zod schema (`settingsSchema`) with an `eventEngineEnabled: z.boolean()`.
     - Add a matching entry to `FIELD_DEFINITIONS` under the `environment` section with `default: false`.
     - Include the flag inside `createDefaultPageSettings`, `formDataToPageSettings`, and `pageSettingsToFormData`.

2. **Initial state**
   - When seeding `currentFormData` (search for `const currentFormData`), pull `settings.environment.enableEventEngine ?? false`.
   - Ensure `setSettings(saveSettings())` merges the flag back into `AppSettings` before persisting.

3. **UI control**
   - In the “Environment” card (where SSL, Origin, etc. live), add a new `Switch` + label such as “Enable Event Engine (beta)”.
   - Hook it up via `FormField` just like the `ssl` switch. The handler should call `field.onChange(event)` with a boolean.
   - Add a short `FormDescription` explaining that the legacy mode will be used when the switch is off.

4. **Config sync**
   - Confirm `handleSubmit` spreads `eventEngineEnabled` into the environment block when calling `storage.saveSettings`.
   - Update any `notifySettingsChange()` payloads to ensure hooks re-read the new field.

## 3. Hook & Context Propagation

**Status:** Completed.

**Notes:**
- `usePubNub` and `PubNubProvider` instantiate clients with the toggle and treat the flag as a reconnection trigger.
- `usePubNubSubscription` now branches: Event Engine keeps `subscriptionSet`, legacy mode reverts to classic `subscribe`/`unsubscribe` with listener management and presence support.

1. **`usePubNub` hook**
   - File: `src/hooks/usePubNub.ts`
     - When building `pubnubConfig`, append `enableEventEngine: settings.environment.enableEventEngine`.
     - Make sure reconnect and settings-change code paths consider the new flag: update comparisons where we determine if the environment changed.

2. **`PubNubProvider`**
   - File: `src/contexts/pubnub-context.tsx`
     - Include the flag when `createInstance` builds configuration objects.
     - Add the flag to the “critical settings changed” guard so toggling forces `refreshConnections()`.
     - Update `getConnectionStatus` / debug data if you want to display the active mode later (optional but recommended).

3. **`usePubNubSubscription` hook**
   - File: `src/components/pubsub/hooks/usePubNubSubscription.ts`
     - Read `settings.environment.enableEventEngine` alongside the other environment fields.
     - Pass the flag into the config when instantiating `PubNub`.

4. **Central config helpers**
   - Any call to `createPubNubConfig(...)` or `validatePubNubConfig(...)` should forward the new flag so existing feature pages automatically inherit the correct mode.

## 4. Feature Modules Requiring Dual Implementations

The following areas currently assume Event Engine APIs (`pubnub.channel()`, `subscriptionSet`). Each must branch so the legacy transport still works.

### 4.1 Pub/Sub Monitor (`usePubNubSubscription`)

**Status:** Completed.

**Notes:**
- Event Engine path unchanged; legacy path now uses `addListener` + `subscribe` with matching cleanup and cursor/filter support.
- Legacy subscriptions track channel/group metadata to ensure unsubscribe correctness.

*Current behaviour:* builds a `subscriptionSet` and uses `subscriptionSet.addListener(...)`.

*Required changes:*
- After loading settings, branch on `enableEventEngine`:
  - **Event Engine ON:** keep existing logic unchanged.
  - **Event Engine OFF:** fall back to classic `pubnubInstance.addListener`, `pubnubInstance.subscribe({ channels, channelGroups, withPresence, timetoken… })`, and `pubnubInstance.unsubscribe`.
- Abstract message/presence/status handlers so both paths share the same callback wiring.
- Ensure cleanup (`unsubscribe` and `removeAllListeners`) runs for both branches.
- Guard any Event Engine–specific methods (e.g. `subscriptionSet.unsubscribe()`) behind the branch so TypeScript knows they’re not called in legacy mode.

### 4.2 File Sharing (`src/components/file-sharing/FileSharingPage.tsx`)

**Status:** Completed.

**Notes:**
- Realtime file watcher now switches between `channel().subscription()` and legacy `addListener` + `subscribe`.

*Current behaviour:* uses `pubnub.channel(selectedChannel).subscription()` to watch for file events.

*Required changes:*
- Access the new flag via `settings.environment.enableEventEngine`.
- If ON, keep the existing subscription code.
- If OFF, convert to legacy listeners:
  ```ts
  const listener = {
    file: (fileEvent) => { ... },
  };
  pubnub.addListener(listener);
  pubnub.subscribe({ channels: [selectedChannel] });
  ```
- Cleanup must remove the listener and call `pubnub.unsubscribe`.

### 4.3 Presence Simulator (`src/pages/presence-v2.tsx`)

**Status:** Completed.

**Notes:**
- Simulated users store their mode (`event-engine` vs `legacy`) and connect/disconnect logic mirrors each transport.
- Legacy users subscribe via classic APIs; event-engine users retain subscription objects for state management.

*Current behaviour:* every simulated user sets `enableEventEngine: true` and calls `pubnub.channel(channelName).subscription()`.

*Required changes:*
- Replace the hard-coded `enableEventEngine: true` with the settings flag.
- Branch when creating or renaming simulated users:
  - Event Engine path keeps the `channel().subscription()` logic.
  - Legacy path should:
    - Reuse the shared listener wiring from the Pub/Sub hook (consider extracting a helper so logic is reusable).
    - Use `pubnub.subscribe({ channels: [targetChannel], withPresence: receivePresenceEvents })`.
    - Manually manage presence state updates (join/leave) because legacy subscribe events surface the same metadata via listeners.
- Update the UI hints/tooltips to explain that certain advanced features (for example, per-subscription heartbeat overrides) may require Event Engine to be on.

### 4.4 Access Manager (`src/pages/access-manager.tsx`)

**Status:** Completed.

**Notes:**
- Access Manager instantiation now forwards `enableEventEngine` so operations remain consistent with toggle state.

Primarily performs REST calls but still instantiates a `new PubNub(...)`:
- Pass the flag into `pubnubConfig` so operations follow the global setting.
- No additional branching is required because the page doesn’t rely on Event Engine–specific APIs, but doing so keeps the per-instance behaviour consistent.

### 4.5 Other direct instantiations

**Status:** Completed (audit performed during Phase 3/4 work).

Audit all `new window.PubNub(...)` calls in `src/`:
- `src/contexts/pubnub-context.tsx`
- `src/hooks/usePubNub.ts`
- `src/components/pubsub/hooks/usePubNubSubscription.ts`
- `src/pages/access-manager.tsx`
- `src/pages/presence-v2.tsx`
- `src/components/file-sharing/FileSharingPage.tsx`

Each constructor must spread `enableEventEngine` so every runtime client honours the toggle.

## 5. UI & Diagnostics

**Status:** Completed.

**Notes:**
- Test Connection page now surfaces Event Engine mode in the Environment summary.
- Storage change listener already respects the flag through `storage.getSettings()`/`saveSettings`.

1. **Expose the current mode**
   - File: `src/pages/test-connection.tsx`
     - Add a line in the “Environment Settings” section showing `Event Engine: Enabled / Disabled` using `context.settings.environment.enableEventEngine`.
   - Optional: include the field in any other status views or analytics screens that log configuration.

2. **Settings storage in other tabs**
   - Ensure the storage event listener in `PubNubProvider` (cross-tab sync) forwards the new flag when merging settings pulled from `localStorage`.

## 6. QA Checklist

**Status:** Partially completed (manual validation pending). Automated checks run locally: ✅ `npm run check`; ❌ `npm test` (Playwright suites remain disabled per repo guidance).

1. Toggle OFF → verify:
   - Pub/Sub monitor still receives messages/presence.
   - File sharing events arrive in real time.
   - Presence simulator spins up test users using legacy subscribe/unsubscribe flows.
   - No runtime errors referencing `channel()` or `subscriptionSet`.

2. Toggle ON → confirm existing Event Engine behaviour remains intact.

3. Run `npm run check` and `npm test` to catch any type regressions or unit failures.

4. Manually clear `localStorage` to ensure the default settings (with `enableEventEngine` present) initialise without crashing.

5. Upgrade path: load the app with a pre-existing settings payload (no flag), ensure the migration logic sets it to `false` and the settings page renders the toggle unchecked.

## 7. Future Enhancements

- Consider exposing the toggle via URL query or per-page overrides so advanced users can experiment without altering the global setting.
- Once legacy support is no longer required, the branching logic can be removed and the toggle enforced to `true`.

---

With these changes in place, engineers can confidently run the application against both transports, making it easier to validate Event Engine adoption without sacrificing backwards compatibility.
