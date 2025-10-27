# Presence State Enhancements Proposal

## Goals
- Allow Presence V2 users to set PubNub Presence State values for each simulated user.
- Surface Presence State data for any visible user in the Live Occupancy or Connected Users panels.
- Notify operators when Presence State changes, regardless of whether the change originates from the simulated user controls or another client.

## Background
PubNub Presence supports per-UUID state storage while a user is subscribed to a channel. Relevant APIs:
- `pubnub.setState({ channels, state })` to associate a JSON object with the calling UUID on specific channels.
- `pubnub.getState({ uuid, channels })` to read the state for an arbitrary UUID.
- Presence events emit an `action` of `state-change` with the new state, and `hereNow({ includeUUIDs: true, includeState: true })` returns current state snapshots.
State is ephemeral and cleared automatically when the client disconnects.

The V2 Presence page already maintains simulated PubNub clients per user, connected via the entity API. Extending those clients to manage state unlocks richer testing scenarios (user metadata, device info, game stats, etc.).

## Proposed Enhancements

### 1. Per-simulated user state controls
- **UI Placement:** Add a "State" control to each simulated user card beneath the connect/disconnect button.
  - A compact JSON editor toggle (e.g., textarea or key/value pill builder) with validation (max depth 1, values limited to string/number/boolean/null per Presence requirements).
  - Provide quick presets (e.g., `{"status":"typing"}`, `{"region":"NA"}`) to reduce typing.
- **Behavior:**
  - On save, call `setState({ channels: [activeChannel], state: parsedState })` from that user’s PubNub client.
  - Optimistically display state on the card, falling back to presence confirmation (see §3).
  - Disable editing while the simulated user is disconnected.
- **Storage:** persist draft state per simulated user in React state so the UI retains values even if not yet sent.

### 2. Presence State visualization
- **Connected Users panel:** next to each UUID, show a summary chip (e.g., `status=typing`). Clicking a user opens a drawer with full JSON state.
  - Data source: maintain a `uuid -> state` map updated from:
    - `setState` promises for local users (optimistic update).
    - Presence stream events (`state-change`, `join` with state payload).
    - `hereNow({ includeUUIDs: true, includeState: true })` refreshes (initial connect, manual refresh, Delete All cleanup).
- **Snapshot section:** update Here Now Snapshot to include state when available.
- **Where Now lookup:** extend results to display state for each channel returned by `getState` or `hereNow` when the lookup UUID matches.

### 3. State change notifications
- **Event handling:**
  - Extend the presence listener to capture `state-change`, `join` (with state), and `leave/timeout` (clear cached state).
  - When a `state-change` arrives, enqueue a toast message summarizing the delta (e.g., `User 2 → status=away`). Provide an inline "View" button to jump to the user drawer.
- **Diffing:** track previous state per UUID to highlight changed keys while ignoring unchanged fields.
- **Error handling:** surface errors from `setState` via destructive toasts so operators know if a change failed.

### 4. Additional tooling
- **Bulk presets:** optional panel controls to apply the same state to all connected simulated users.
- **API inspection:** add debug tabs showing raw `setState`/`getState` responses to aid troubleshooting.
- **Rate limiting safeguards:** delay successive `setState` calls (e.g., debounce 300ms) to avoid request bursts when operators edit quickly.

## Implementation Outline
1. **Data model updates**
   - Extend the simulated user descriptor with `stateDraft: string`, `stateApplied: Record<string, unknown> | null`.
   - Maintain a central `presenceStateByUuid` map in component state.
2. **API utilities**
   - Create helpers in `src/lib/presence` for `setSimulatedUserState(pubnub, channel, state)` and `getUserState(pubnub, uuid, channel)`.
3. **UI components**
   - Build `SimulatedUserStateEditor` component with JSON validation and preset buttons.
   - Build `PresenceStateBadge`/drawer for Connected Users list.
4. **Event integration**
   - Update the presence listener to normalize and store state payloads on `join`/`state-change`.
   - On Delete All cleanup, wait for 1s and refresh via `hereNow` with `includeState: true`.
5. **Notifications**
   - Reuse the toast system (`useToast`) to display state change alerts with contextual links.
6. **Testing**
   - Add Vitest coverage around state parsing utilities.
   - Manual verification steps covering: set/get state flows, state-change events from external clients, Delete All synchronization.

## Future Considerations
- Allow operators to script state rotations (e.g., cycling through statuses) to simulate richer behavior.
- Persist commonly used state templates in local storage for quick reuse.
- Optionally integrate App Context (Objects) to map UUIDs to richer profiles displayed alongside state.

