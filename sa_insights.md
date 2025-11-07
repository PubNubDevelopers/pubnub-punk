# Solution Architect Insights

Known bugs and enhancement ideas:

## Bugs

### B1. Channel Group “Copy JSON” button throws an error  
- **Area:** `src/pages/channel-groups.tsx:603-618`, `copyGroupConfig`  
- **Fix approach:**  
  1. Replace the direct `navigator.clipboard.writeText` call with a helper that first tries the async Clipboard API and falls back to a hidden `<textarea>` + `document.execCommand('copy')` for HTTP or older browsers.  
  2. Surfaced toast messaging should differentiate between permission denial and unexpected errors so users know if they must grant clipboard rights.  
  3. Add a unit test (Vitest + jsdom) that mocks both success and fallback paths to prevent regressions.  
- **Value:** Guarantees the exported channel-group JSON can always be captured for auditing or recreating groups, even when the browser blocks the modern clipboard API.

### B2. Presence simulated users reset when navigating away  
- **Area:** `src/pages/presence-v2.tsx` (`simulatedUsers` / `presenceStateByUuid` state)  
- **Fix approach:**  
  1. Persist simulated user definitions in `storage` (see `src/lib/storage.ts`) keyed by the active channel, and hydrate them on mount so the roster survives route changes or reloads.  
  2. Move the simulated-user PubNub instances into the shared `InstanceRegistry` (via `usePubNubContext().createInstance`) and only dispose them when the user explicitly removes a simulator.  
  3. Add a cleanup effect that shuts down lingering instances on logout to avoid ghost connections.  
- **Value:** Preserves test harness continuity—solution architects can set up a presence scenario once, move between tools for diagnostics, and return without losing their simulated audience.

## Enhancements

### E1. Clarify Channel Group terminology and flows  
- **Area:** `src/pages/channel-groups.tsx` sidebar dialogs  
- **Implementation:**  
  1. Rename the “Manage Existing Channel Group” dialog title/button copy to “Add Channel Group to Workspace”, and change the primary action label from “Add to Query” to “Load Channel Group”.  
  2. Update field help text/tooltips to use “Channel Group” consistently, or introduce “Subscription List (Channel Group)” if marketing prefers the new label; wire this copy through the constant map at the top of the file so it stays consistent.  
  3. Document the workflow in the sidebar empty state so users understand the difference between creating a group and querying one.  
- **Value:** Reduces onboarding friction—makes it obvious that the panel loads an existing Channel Group instead of building a query language.

### E2. Channel naming guidance should prefer dotted notation  
- **Area:** `src/pages/presence-v2.tsx` (`DEFAULT_CHANNEL`), Pub/Sub quick-publish placeholders, channel-group examples  
- **Implementation:**  
  1. Change default channel constants/placeholders to dotted examples such as `chat.room1` or `sales.support.live`.  
  2. Centralize sample channel strings in `src/lib/constants/channel-examples.ts` (new) and import wherever placeholders are used so the convention stays aligned across tools.  
  3. Add a short help tooltip explaining PubNub’s recommended naming convention.  
- **Value:** Encourages best practices by default, especially for teams new to PubNub channel naming strategies.

### E3. Keep Pub/Sub live while inspecting Presence  
- **Area:** Interaction between `PubSubPageEnhanced` and `PresenceV2Page`  
- **Implementation:**  
  1. Audit `PubSubPageEnhanced` to ensure it subscribes via `usePubNubContext()` and does not `unsubscribeAll()` on unmount unless explicitly toggled off.  
  2. In `PresenceV2Page`, reuse the shared PubNub instance (or create a dedicated instance with a unique UUID) without calling `pubnub.unsubscribeAll()` when starting/stopping monitoring.  
  3. Expose a connection status widget in the shell (`src/components/app-shell.tsx`) so users can confirm both tools are connected simultaneously.  
- **Value:** Lets solution architects publish traffic, then pivot to Presence without losing the original stream—mirrors real-world debugging flows.

### E4. Access Manager should surface generated tokens  
- **Area:** `src/pages/access-manager.tsx` (token grant flow)  
- **Implementation:**  
  1. After `grantToken`, show the raw token string alongside the parsed payload with a “Copy Token” affordance.  
  2. Persist a history table (local-only) of recently granted tokens with actions to parse or revoke them later.  
  3. Add guidance text clarifying storage expectations (tokens aren’t stored server-side).  
- **Value:** Eliminates a blind spot—developers can immediately reuse, share, or revoke the tokens they just minted.

### E5. Settings should open inline, not as a blocking route  
- **Area:** `src/pages/settings.tsx`, `src/components/app-shell.tsx`  
- **Implementation:**  
  1. Extract the settings form into a reusable `<SettingsDialog>` component.  
  2. Provide a modal trigger in the app shell header; when keys are missing, auto-open the dialog but keep the current tool rendered behind it.  
  3. Preserve backward compatibility by keeping `/` route but have it also render the dialog atop the previous screen when navigated directly.  
- **Value:** Users keep their working context (e.g., Pub/Sub, Presence) while updating credentials—fewer hops, faster iteration.

### E6. Expand Settings coverage (log levels, crypto, retry, proxy)  
- **Area:** `src/types/settings.ts`, `src/pages/settings.tsx`, `src/hooks/usePubNub.ts`  
- **Implementation:**  
  1. Update the `EnvironmentSettings` type + form to use the new `logVerbosity` API (`'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'OFF'`) and map opinions to the SDK enum.  
  2. Add controls for message encryption (none / standard / partial—wire to `cipherKey` + custom encryptor hooks) with contextual warnings about payload inspection features that break under encryption.  
  3. Expose retry strategy knobs (`setRetryConfiguration`) and proxy host/port headers, saving them to settings and applying inside `usePubNub`.  
  4. Gate advanced fields behind an “Advanced” accordion to avoid overwhelming new users.  
- **Value:** Brings the settings panel to parity with modern PubNub SDK capabilities, letting architects simulate complex customer environments.

### E7. Pub/Sub advanced tooling  
- **Area:** `src/components/pubsub` suite  
- **Implementation:**  
  1. Validate channel names before subscribe/publish (regex + inline error) and link to documentation for allowed characters.  
  2. Add a push payload builder that maps form fields to the SDK helper (or re-creates it for SDK v10) and conditionally encrypts payloads when channel ciphering is enabled.  
  3. Offer toggles to subscribe to message actions, App Context events, files, and push notification debug channels, routing them into the live message stream with color-coded badges.  
  4. Provide “Add Message Action”/“Remove Message Action” buttons using the `pubnub.addMessageAction` and `removeMessageAction` APIs with channel/timetoken pickers.  
- **Value:** Centralizes rich Pub/Sub workflows, reducing the need for ad-hoc scripts during customer troubleshooting.

### E8. Message Actions explorer  
- **Area:** New component under `src/components/message-actions`  
- **Implementation:**  
  1. Build a tab within Pub/Sub (or a standalone page) that lists message actions for a selected channel + message, using `getMessageActions` with pagination.  
  2. Provide filters by action type and quick links to resend or delete the underlying message.  
- **Value:** Makes it trivial to audit reactions, receipts, and other action metadata when debugging chat experiences.

### E9. Presence defaults and UX polish  
- **Area:** `src/pages/presence-v2.tsx`  
- **Implementation:**  
  1. Update `DEFAULT_CHANNEL` and here-now placeholders to dotted examples (e.g., `presence.demo.room1`).  
  2. Add helper text clarifying PubNub’s presence suffix pattern (`-pnpres`).  
  3. Optionally seed a one-click “Sample Room” button that creates simulated users with human-friendly names.  
- **Value:** Reduces confusion between base channels and presence channels while nudging users toward scalable naming schemes.

### E10. Test Connection transparency  
- **Area:** `src/pages/test-connection.tsx`  
- **Implementation:**  
  1. Replace the generic cards with a step-by-step list that explains each test (Main instance, Time API, Multi-instance, Context) and links to the code path being exercised.  
  2. Capture raw latency metrics (time API round-trip, subscribe handshake) and show pass/fail thresholds.  
  3. Export results as JSON so support can attach them to tickets.  
- **Value:** Converts a black-box diagnostic into a teachable, support-ready report.

### E11. Persistence v2 roadmap  
- **Area:** `src/pages/pubnub-persistence.tsx`  
- **Implementation:**  
  1. Restructure the history view into a table with columns for payload preview (P), presence events (F), message type (N), and timetoken (L)—mirroring Craig’s screenshot.  
  2. Add a “Max Results” field that chains fetches until the user-defined total is met, with progress feedback.  
  3. Allow CSV/JSON export of the aggregated set.  
- **Value:** Makes deep history analysis viable without manual pagination, aiding migration assessments and debugging.

### E12. Account-aware tooling  
- **Area:** Settings + multi-tool integration  
- **Implementation:**  
  1. Provide an optional PubNub Dashboard OAuth login; upon success, list available apps/keysets and let the user select one to auto-populate credentials across tools.  
  2. Share the selection across App Context, Functions, E&A, Insights, Illuminate, etc., auto-loading the relevant dashboards or API data.  
  3. Ensure logout clears cached keys/secrets to keep the tool safe for shared machines.  
- **Value:** Removes manual key juggling and opens the door to authenticated admin workflows directly inside the toolkit.

### E13. Diagnostics tool backlog (“Why 403?”, Push Debug, Message Buffer Dump, Long Shot)  
- **Area:** New pages/modules  
- **Implementation:**  
  1. “Why 403?”: Build an internal-only page that ingests log snippets, runs Rajat’s logic to identify common PAM issues, and outputs remediation steps.  
  2. Push Debug: Port the existing toolbox script into the React shell, leveraging the push payload builder (E7) and showing APNS/FCM responses.  
  3. Message Generator/Buffer Dump: Integrate the robust generator from `utils/` or rebuild with AI-assisted templating; allow scheduling bursts and previewing PubNub rate impact.  
  4. Long Shot cost tracker: Stream transaction metrics via the Insights or Audit APIs and visualize spend by endpoint.  
- **Value:** Provides a consolidated, officially supported workspace for support engineers—reducing context switching across legacy internal tools.

