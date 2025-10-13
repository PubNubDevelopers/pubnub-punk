// Utility functions for PubNub Access Manager

import type { TokenData, ParsedToken, ChannelPermissions, ChannelGroupPermissions, UuidPermissions, GrantForm } from '@/types/access-manager';

// Permission bit values
export const PERMISSION_BITS = {
  READ: 1,
  WRITE: 2,
  MANAGE: 4,
  DELETE: 8,
  CREATE: 16,
  GET: 32,
  UPDATE: 64,
  JOIN: 128
} as const;

// Convert numeric bitmask to permission object for channels
export function bitmaskToChannelPermissions(bitmask: number): ChannelPermissions {
  return {
    read: (bitmask & PERMISSION_BITS.READ) !== 0,
    write: (bitmask & PERMISSION_BITS.WRITE) !== 0,
    get: (bitmask & PERMISSION_BITS.GET) !== 0,
    manage: (bitmask & PERMISSION_BITS.MANAGE) !== 0,
    update: (bitmask & PERMISSION_BITS.UPDATE) !== 0,
    join: (bitmask & PERMISSION_BITS.JOIN) !== 0,
    delete: (bitmask & PERMISSION_BITS.DELETE) !== 0,
  };
}

// Convert numeric bitmask to permission object for channel groups
export function bitmaskToChannelGroupPermissions(bitmask: number): ChannelGroupPermissions {
  return {
    read: (bitmask & PERMISSION_BITS.READ) !== 0,
    manage: (bitmask & PERMISSION_BITS.MANAGE) !== 0,
  };
}

// Convert numeric bitmask to permission object for UUIDs
export function bitmaskToUuidPermissions(bitmask: number): UuidPermissions {
  return {
    get: (bitmask & PERMISSION_BITS.GET) !== 0,
    update: (bitmask & PERMISSION_BITS.UPDATE) !== 0,
    delete: (bitmask & PERMISSION_BITS.DELETE) !== 0,
  };
}

// Convert parsed token to TokenData format for storage
export function parsedTokenToTokenData(token: string, parsedToken: ParsedToken, description?: string): TokenData {
  const ttl = parsedToken.ttl;
  const createdAt = new Date(parsedToken.timestamp * 1000);
  const expiresAt = new Date(createdAt.getTime() + ttl * 60 * 1000);
  const now = new Date();
  
  // Convert numeric permissions to boolean format
  const permissions: TokenData['permissions'] = {};
  
  if (parsedToken.resources) {
    if (parsedToken.resources.channels) {
      permissions.channels = {};
      for (const [channel, perms] of Object.entries(parsedToken.resources.channels)) {
        permissions.channels[channel] = typeof perms === 'number' 
          ? bitmaskToChannelPermissions(perms)
          : perms;
      }
    }
    
    if (parsedToken.resources.groups) {
      permissions.channelGroups = {};
      for (const [group, perms] of Object.entries(parsedToken.resources.groups)) {
        permissions.channelGroups[group] = typeof perms === 'number'
          ? bitmaskToChannelGroupPermissions(perms)
          : perms;
      }
    }
    
    if (parsedToken.resources.uuids) {
      permissions.uuids = {};
      for (const [uuid, perms] of Object.entries(parsedToken.resources.uuids)) {
        permissions.uuids[uuid] = typeof perms === 'number'
          ? bitmaskToUuidPermissions(perms)
          : perms;
      }
    }
  }
  
  // Convert patterns similarly
  const patterns: TokenData['patterns'] = {};
  
  if (parsedToken.patterns) {
    if (parsedToken.patterns.channels) {
      patterns.channels = {};
      for (const [pattern, perms] of Object.entries(parsedToken.patterns.channels)) {
        patterns.channels[pattern] = typeof perms === 'number'
          ? bitmaskToChannelPermissions(perms)
          : perms;
      }
    }
    
    if (parsedToken.patterns.groups) {
      patterns.channelGroups = {};
      for (const [pattern, perms] of Object.entries(parsedToken.patterns.groups)) {
        patterns.channelGroups[pattern] = typeof perms === 'number'
          ? bitmaskToChannelGroupPermissions(perms)
          : perms;
      }
    }
    
    if (parsedToken.patterns.uuids) {
      patterns.uuids = {};
      for (const [pattern, perms] of Object.entries(parsedToken.patterns.uuids)) {
        patterns.uuids[pattern] = typeof perms === 'number'
          ? bitmaskToUuidPermissions(perms)
          : perms;
      }
    }
  }
  
  return {
    id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    token,
    authorizedUserId: parsedToken.authorized_uuid,
    ttl,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    permissions,
    patterns: Object.keys(patterns).length > 0 ? patterns : undefined,
    meta: parsedToken.meta,
    status: expiresAt > now ? 'active' : 'expired',
    description
  };
}

// Format permission list for display
export function formatPermissions(permissions: Record<string, boolean>): string {
  return Object.entries(permissions)
    .filter(([_, hasPermission]) => hasPermission)
    .map(([permission]) => permission)
    .join(', ') || 'none';
}

// Check if token is expired
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

// Field definitions for config management
export const FIELD_DEFINITIONS = {
  'accessManager.tokens': { section: 'accessManager', field: 'tokens', type: 'array', default: [] },
};

// Default grant form state
export const DEFAULT_GRANT_FORM: GrantForm = {
  ttl: 60,
  authorizedUserId: '',
  description: '',
  channels: [],
  channelGroups: [],
  uuids: [],
  channelPatterns: [],
  channelGroupPatterns: [],
  uuidPatterns: [],
  meta: {},
};
