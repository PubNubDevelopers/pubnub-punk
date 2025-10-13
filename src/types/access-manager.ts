// Types for PubNub Access Manager

export interface ChannelPermissions {
  read?: boolean;
  write?: boolean;
  get?: boolean;
  manage?: boolean;
  update?: boolean;
  join?: boolean;
  delete?: boolean;
}

export interface ChannelGroupPermissions {
  read?: boolean;
  manage?: boolean;
}

export interface UuidPermissions {
  get?: boolean;
  update?: boolean;
  delete?: boolean;
}

export interface TokenData {
  id: string;
  token: string;
  authorizedUserId?: string;
  ttl: number;
  createdAt: string;
  expiresAt: string;
  permissions: {
    channels?: Record<string, ChannelPermissions>;
    channelGroups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  patterns?: {
    channels?: Record<string, ChannelPermissions>;
    channelGroups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  meta?: Record<string, any>;
  status: 'active' | 'expired' | 'revoked';
  description?: string;
}

export interface ParsedToken {
  version: number;
  timestamp: number;
  ttl: number;
  authorized_uuid?: string;
  resources?: {
    channels?: Record<string, ChannelPermissions>;
    groups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  patterns?: {
    channels?: Record<string, ChannelPermissions>;
    groups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  meta?: Record<string, any>;
}

export interface GrantRequest {
  ttl: number;
  authorized_uuid?: string;
  resources?: {
    channels?: Record<string, ChannelPermissions>;
    groups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  patterns?: {
    channels?: Record<string, ChannelPermissions>;
    groups?: Record<string, ChannelGroupPermissions>;
    uuids?: Record<string, UuidPermissions>;
  };
  meta?: Record<string, any>;
}

export interface GrantFormEntry {
  name: string;
  permissions: Record<string, boolean>;
}

export interface GrantPatternEntry {
  pattern: string;
  permissions: Record<string, boolean>;
}

export interface GrantForm {
  ttl: number;
  authorizedUserId: string;
  description: string;
  channels: GrantFormEntry[];
  channelGroups: GrantFormEntry[];
  uuids: GrantFormEntry[];
  channelPatterns: GrantPatternEntry[];
  channelGroupPatterns: GrantPatternEntry[];
  uuidPatterns: GrantPatternEntry[];
  meta: Record<string, any>;
}
