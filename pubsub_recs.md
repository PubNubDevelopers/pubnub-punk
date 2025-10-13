# Pub/Sub UX Improvements – Phased Implementation Plan

This plan captures concrete, staged improvements to the Pub/Sub page at `/pubsub` while preserving all current functionality. Each task includes impacted files, suggested implementation steps, and acceptance criteria so a front‑end dev can implement confidently.

## Phase 1 — High‑Impact, Low‑Effort (1–2 days)

1) Move Connect control into Subscription Configuration header
- Goal: Users configure and connect in one place; reduce cognitive hops.
- Files:
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
  - `src/components/pubsub/SubscriptionConfigPanel.tsx`
  - `src/components/pubsub/shared/StatusIndicator.tsx` (keep for inline use, optional)
- Steps:
  - Remove the top‑level “Subscription Status” card block from `PubSubPageEnhanced.tsx` (the one rendering `StatusIndicator` + ON/OFF `Switch`).
  - In `SubscriptionConfigPanel.tsx`, add a small header right section with:
    - Connection `Switch` bound to `isSubscribed` and callbacks `{handleSubscribe, handleUnsubscribe}` (currently in `PubSubPageEnhanced.tsx`).
    - Inline text state: `Connected/Disconnected` and a short channel summary (truncate + tooltip).
    - Optional: reuse `StatusIndicator` inline beside the switch.
  - Route the `isSubscribed`, `subscribe`, and `unsubscribe` from `PubSubPageEnhanced.tsx` down to `SubscriptionConfigPanel` via props.
- Acceptance:
  - The Connect toggle appears in the Subscription Configuration card header.
  - Toggling connects/disconnects as before; the removed top status block does not reduce functionality.

2) Highlight Presence toggle within Live Messages (discovery aid)
- Goal: Keep the presence delivery control in the Live Messages header for visibility while wiring to subscription state.
- Files:
  - `src/components/pubsub/LiveMessagesPanel.tsx`
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
- Steps:
  - Ensure the `Receive Presence Events` switch remains in the panel header and is wired through `onReceivePresenceEventsChange` to update subscription state.
  - Add helper text or tooltip if needed once the layout stabilises.
- Acceptance:
  - Toggling from the Live Messages header still updates `subscribeData.receivePresenceEvents` and the subscription hook.

3) Fix Filters tab badge to reflect only active (complete) filters
- Goal: Avoid mismatch (e.g., “Filters 1” while summary says “No filters active”).
- Files:
  - `src/components/pubsub/SubscriptionConfigPanel.tsx`
  - `src/components/pubsub/tabs/FiltersTab.tsx`
- Steps:
  - Compute `validCount = filters.filter(f => f.field?.trim() && f.value?.trim()).length` in `SubscriptionConfigPanel.tsx` and display badge = `validCount`.
  - Optionally show “• Incomplete: N” inside FiltersTab when there are unfinished conditions.
- Acceptance:
  - The tab badge matches number of valid conditions; summary matches.

4) Improve Quick Publish editor to a multi‑line JSON field with validation
- Goal: Make composing JSON easier; reduce failed publishes.
- Files:
  - `src/components/pubsub/QuickPublishPanel.tsx`
- Steps:
  - Replace the current single‑line Message `Input` with a `Textarea` (2–4 rows) using monospace styling.
  - On “Publish” click, pre‑validate JSON with `try { JSON.parse(...) }` and if invalid, toast descriptive error and abort (do not rely solely on hook error).
  - Keep “Format” action; if JSON is valid, pretty‑print using `JSON.stringify(parsed, null, 2)`.
- Acceptance:
  - Users can enter multi‑line JSON; invalid JSON shows an immediate toast and does not attempt publish.

5) Add actionable empty state in Live Messages
- Goal: Guide users to connect from the empty state.
- Files:
  - `src/components/pubsub/LiveMessagesPanel.tsx`
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
- Steps:
  - In the “No messages yet” state, add a primary button “Connect to Channels”.
  - On click, scroll to `SubscriptionConfigPanel` (use `[data-testid="subscription-config"]`) and focus the channels input.
- Acceptance:
  - Button appears when disconnected and there are no messages; clicking scrolls/focuses Subscription Configuration.

## Phase 2 — Information Architecture & Layout (1–2 days)

6) Reorder main sections for task flow
- Goal: Configure → Connect → Observe → Publish.
- Files:
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
- Steps:
  - Order components: `SubscriptionConfigPanel` (with Connect) → `LiveMessagesPanel` → `QuickPublishPanel`.
  - Keep display toggles (show raw) with messages; keep presence delivery in Advanced.
- Acceptance:
  - New section order visible; functionality unchanged.

7) Desktop two‑column layout; mobile stacked
- Goal: Better use of space; keep a clear reading path.
- Files:
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
- Steps:
  - Wrap page body in a responsive grid (Tailwind example):
    - Desktop (`lg:`): `grid grid-cols-12 gap-6`.
    - Left (span 7): `LiveMessagesPanel`.
    - Right (span 5): stack `QuickPublishPanel` above `SubscriptionConfigPanel`.
    - Mobile: stack sections in flow order.
- Acceptance:
  - On wide screens, two columns; on narrow screens, stacked.

8) Simplify headings and reduce duplication
- Goal: Declutter visuals.
- Files:
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
- Steps:
  - Keep the page title (from `AppShell`/router). Change the main card header from “PubNub Pub/Sub Tool” to a functional label (“Status” or remove entirely if redundant once Connect is in Subscription Configuration).
- Acceptance:
  - One canonical page title remains; section titles are concise.

## Phase 3 — Validation, Guidance, and Feedback (1–2 days)

9) Inline validation for channels and groups
- Goal: Prevent invalid channel names early.
- Files:
  - `src/components/pubsub/tabs/ChannelsTab.tsx`
  - `src/components/pubsub/utils.ts` (already has `validateChannel`)
- Steps:
  - As user types, split by commas and validate each via `validateChannel`; show a small success/error badge near the input with the count of invalid entries.
  - Tooltip on error to list which channels are invalid.
- Acceptance:
  - Invalid entries trigger visible guidance; publish/subscribe still possible if user ignores, but UX nudges correction.

10) Help tooltips on advanced options
- Goal: Explain “Receive Presence Events”, “With Presence (heartbeat)”, TTL, custom message type.
- Files:
  - `src/components/pubsub/tabs/AdvancedTab.tsx`
  - `src/components/pubsub/QuickPublishPanel.tsx`
- Steps:
  - Use `@/components/ui/tooltip` to add concise hover tooltips for each control. Keep copy short (1–2 sentences).
- Acceptance:
  - Hovering shows helpful descriptions; no layout shifts.

11) Clarify “Copy All” behaviour with dropdown
- Goal: Make copy intent explicit.
- Files:
  - `src/components/pubsub/LiveMessagesPanel.tsx`
  - `src/components/pubsub/shared/CopyHandlers.tsx`
- Steps:
  - Replace the single “Copy All” button with a split‑button or dropdown menu (use `DropdownMenu`) with:
    - “Copy raw events” (current behaviour)
    - “Copy formatted messages” (pretty‑printed message bodies only)
  - Implement a new helper to map `messages` → formatted text.
- Acceptance:
  - Users can choose copy mode; toasts confirm which mode.

12) “Reconnect to apply changes” inline banner
- Goal: Make the required next action obvious when config changes.
- Files:
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
- Steps:
  - When `unsubscribe()` occurs due to config change, render a non‑blocking inline banner above `LiveMessagesPanel` with summary text and a “Reconnect” button (calls `subscribe()`); hide on success.
  - Keep the toast, but banner drives action.
- Acceptance:
  - Banner appears on config change; clicking Reconnect restores subscription.

## Phase 4 — Optional Enhancements (1–2 days)

13) Presets and recent history for channels and filters
- Files:
  - `src/components/pubsub/tabs/ChannelsTab.tsx`
  - `src/components/pubsub/tabs/FiltersTab.tsx`
  - `src/lib/storage.ts`
- Steps:
  - Add small “Save Preset” and “Recent” menus; persist in localStorage with bounded history (e.g., last 5).
- Acceptance:
  - Users can save/recall common channel sets and filter configurations.

14) Connection details drawer (diagnostics)
- Files:
  - `src/components/pubsub/PubSubPageEnhanced.tsx`
  - `src/contexts/pubnub-context.tsx` (for details)
- Steps:
  - Collapsible panel showing instance ID, origin, SDK version, and filter expression; useful for support.
- Acceptance:
  - Drawer reveals helpful, read‑only diagnostics without cluttering main UI.

---

## UI Text & Microcopy (examples)
- Connect toggle: “Connect” (on) / “Disconnect” (off). Helper: “Connect to start receiving messages.”
- Presence toggle (Advanced): “Receive Presence Events” — “Deliver join/leave/timeouts for subscribed channels.”
- With Presence (Advanced): “Enable Heartbeat” — “Send heartbeats to remain visible in Presence.”
- Empty state CTA: “Connect to Channels” — “Configure channels and connect to start streaming messages.”

## Notes & Compatibility
- `usePubNubSubscription` already supports `receivePresenceEvents`, `withPresence`, and reconnection; relocating controls won’t affect core logic.
- Keep props stable where possible; for breaking UI prop changes (e.g., removing presence switch props from `LiveMessagesPanel`), update all call sites.
- Maintain `data-testid="subscription-config"` for scroll/focus affordances.

## Rollout & QA Checklist
- Verify Connect toggle in Subscription Configuration connects/disconnects.
- Confirm presence switch in Advanced toggles split view and presence delivery.
- Filters tab badge counts only valid filters; summary matches.
- Quick Publish JSON textarea validates before publish; “Format” prettifies.
- Empty state CTA scrolls/focuses Subscription Configuration.
- Two‑column desktop layout; stacked on mobile.
- Inline banner shows when config change forces disconnect; “Reconnect” works.

## Out‑of‑Scope (for now)
- Full code editor for JSON (Monaco). Textarea is sufficient initially.
- Server‑side presets sharing. Local presets only in Phase 4.
