export interface ParsedPresenceEvent {
  /** The original message envelope from PubNub. */
  raw: Record<string, any>;
  /** Presence channel name (e.g., chat-room-pnpres). */
  presenceChannel: string;
  /** Base channel name without the -pnpres suffix. */
  baseChannel: string;
  /** Action string such as join, leave, timeout, interval, state-change. */
  action?: string;
  /** Primary UUID associated with the action when provided. */
  uuid?: string;
  /** Occupancy value reported with the event. */
  occupancy?: number;
  /** Timestamp (seconds) reported by the event, when present. */
  timestamp?: number;
  /** Arbitrary state payload associated with the UUID. */
  state?: Record<string, unknown> | null;
  /** Aggregated join list (interval events). */
  join?: string[];
  /** Aggregated leave list (interval events). */
  leave?: string[];
  /** Aggregated timeout list (interval events). */
  timeout?: string[];
  /** Timetoken attached to the message. */
  timetoken?: string;
  /** Publisher ID associated with the message (often the UUID). */
  publisher?: string;
}

const PRESENCE_SUFFIX = '-pnpres';

const pickPresenceChannel = (values: Array<unknown>): { presence?: string; fallback?: string } => {
  let fallback: string | undefined;
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (trimmed.endsWith(PRESENCE_SUFFIX)) {
      return { presence: trimmed };
    }
    fallback = fallback ?? trimmed;
  }
  return { fallback };
};

const getFirstString = (...values: Array<unknown>): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const ensureStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const filtered = value.filter((item) => typeof item === 'string') as string[];
  return filtered.length > 0 ? filtered : undefined;
};

export function parsePresenceMessage(envelope: Record<string, any> | null | undefined): ParsedPresenceEvent | null {
  if (!envelope || typeof envelope !== 'object') {
    return null;
  }

  const channelCandidates = [
    (envelope as any).subscription,
    (envelope as any).subscribedChannel,
    (envelope as any).channel,
    (envelope as any).actualChannel,
    (envelope as any).c,
  ];

  const { presence, fallback } = pickPresenceChannel(channelCandidates);
  const presenceChannel = presence ??
    (fallback && fallback.endsWith(PRESENCE_SUFFIX) ? fallback : undefined);

  if (!presenceChannel) {
    // As a last attempt, check for explicit presence channel in payload metadata
    const metadata = (envelope as any).u;
    const metadataChannel = metadata && typeof metadata.pn_subscription === 'string' ? metadata.pn_subscription : undefined;
    if (metadataChannel && metadataChannel.endsWith(PRESENCE_SUFFIX)) {
      return parsePresenceMessage({ ...envelope, subscription: metadataChannel });
    }
    return null;
  }

  if (!presenceChannel.endsWith(PRESENCE_SUFFIX)) {
    return null;
  }

  const baseChannel = presenceChannel.slice(0, -PRESENCE_SUFFIX.length);
  const messageLike = (envelope as any).message ?? (envelope as any).payload ?? (envelope as any).d;
  const message = messageLike && typeof messageLike === 'object' ? (messageLike as Record<string, any>) : {};
  const metadata = (envelope as any).u && typeof (envelope as any).u === 'object' ? ((envelope as any).u as Record<string, any>) : undefined;

  const action = getFirstString(message.action, message.pn_action, metadata?.pn_action);
  const uuid = getFirstString(message.uuid, metadata?.pn_uuid, (envelope as any).uuid, (envelope as any).publisher);

  const occupancyCandidate = message.occupancy ?? message.pn_occupancy ?? metadata?.pn_occupancy;
  const occupancy = typeof occupancyCandidate === 'number' ? occupancyCandidate : undefined;

  const timestampCandidate = message.timestamp ?? message.pn_timestamp ?? metadata?.pn_timestamp;
  const timestamp = typeof timestampCandidate === 'number' ? timestampCandidate : undefined;

  const stateValue = message.state ?? metadata?.pn_state;
  const state = stateValue && typeof stateValue === 'object' ? (stateValue as Record<string, unknown>) : null;

  return {
    raw: envelope,
    presenceChannel,
    baseChannel,
    action,
    uuid,
    occupancy,
    timestamp,
    state,
    join: ensureStringArray(message.join),
    leave: ensureStringArray(message.leave),
    timeout: ensureStringArray(message.timeout),
    timetoken: getFirstString((envelope as any).timetoken, (envelope as any).t?.t, (envelope as any).p?.t),
    publisher: getFirstString((envelope as any).publisher, metadata?.pn_uuid),
  };
}
