// PubNub Access Manager API functions

import type { GrantRequest } from '@/types/access-manager';

// Generate HMAC-SHA256 signature for PubNub REST API
export async function generateSignature(
  subscribeKey: string,
  publishKey: string,
  httpMethod: string,
  uri: string,
  queryParams: Record<string, string>,
  body: string,
  secretKey: string
): Promise<string> {
  // Create the string to sign following PubNub's v3 signature algorithm
  // Format: {method}\n{pub_key}\n{path}\n{query_string}\n{body}
  const sortedParams = Object.keys(queryParams)
    .sort()
    .map(key => `${key}=${encodeURIComponent(queryParams[key])}`)
    .join('&');
  
  const stringToSign = [
    httpMethod.toUpperCase(),
    publishKey,
    uri,
    sortedParams,
    body || ''
  ].join('\n');
  
  
  // Use Web Crypto API for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(stringToSign)
  );
  
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  // Convert to URL-safe Base64 and remove padding
  const urlSafeSignature = base64Signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // PubNub requires v2. prefix for signatures
  return `v2.${urlSafeSignature}`;
}

// Helper function to convert boolean permissions to numeric bitmask
export function convertPermissionsToBitmask(permissions: any): any {
  const converted: any = {};
  
  for (const [resource, perms] of Object.entries(permissions)) {
    if (typeof perms === 'object' && perms !== null) {
      let bitmask = 0;
      const permObj = perms as any;
      
      // Convert boolean permissions to numeric bitmask
      if (permObj.read) bitmask |= 1;      // READ = 1
      if (permObj.write) bitmask |= 2;     // WRITE = 2
      if (permObj.manage) bitmask |= 4;    // MANAGE = 4
      if (permObj.delete) bitmask |= 8;    // DELETE = 8
      if (permObj.create) bitmask |= 16;   // CREATE = 16
      if (permObj.get) bitmask |= 32;      // GET = 32
      if (permObj.update) bitmask |= 64;   // UPDATE = 64
      if (permObj.join) bitmask |= 128;    // JOIN = 128
      
      converted[resource] = bitmask;
    }
  }
  
  return converted;
}

// Helper function to generate curl command for grant token
export async function generateGrantTokenCurl(
  subscribeKey: string,
  publishKey: string,
  secretKey: string,
  grantRequest: GrantRequest
): Promise<string> {
  // Generate current Unix timestamp - PubNub requires this to be within ±60 seconds of NTP time
  const timestamp = Math.floor(Date.now() / 1000);
  const uri = `/v3/pam/${subscribeKey}/grant`;
  
  const queryParams: Record<string, string> = {
    timestamp: timestamp.toString(),
    uuid: 'access-manager-admin'
  };
  
  // Build the request body according to PubNub REST API format
  const requestBody: any = {
    ttl: grantRequest.ttl,
    permissions: {}
  };

  // Add resources with converted permissions
  if (grantRequest.resources && Object.keys(grantRequest.resources).length > 0) {
    requestBody.permissions.resources = {};
    
    if (grantRequest.resources.channels) {
      requestBody.permissions.resources.channels = convertPermissionsToBitmask(grantRequest.resources.channels);
    }
    if (grantRequest.resources.groups) {
      requestBody.permissions.resources.channelGroups = convertPermissionsToBitmask(grantRequest.resources.groups);
    }
    if (grantRequest.resources.uuids) {
      requestBody.permissions.resources.uuids = convertPermissionsToBitmask(grantRequest.resources.uuids);
    }
  }

  // Add patterns with converted permissions
  if (grantRequest.patterns && Object.keys(grantRequest.patterns).length > 0) {
    requestBody.permissions.patterns = {};
    
    if (grantRequest.patterns.channels) {
      requestBody.permissions.patterns.channels = convertPermissionsToBitmask(grantRequest.patterns.channels);
    }
    if (grantRequest.patterns.groups) {
      requestBody.permissions.patterns.channelGroups = convertPermissionsToBitmask(grantRequest.patterns.groups);
    }
    if (grantRequest.patterns.uuids) {
      requestBody.permissions.patterns.uuids = convertPermissionsToBitmask(grantRequest.patterns.uuids);
    }
  }

  // Add meta
  if (grantRequest.meta && Object.keys(grantRequest.meta).length > 0) {
    requestBody.permissions.meta = grantRequest.meta;
  }

  // Add authorized UUID
  if (grantRequest.authorized_uuid) {
    requestBody.permissions.uuid = grantRequest.authorized_uuid;
  }

  const body = JSON.stringify(requestBody, null, 2);
  
  // Generate signature for authentication
  const signature = await generateSignature(subscribeKey, publishKey, 'POST', uri, queryParams, body, secretKey);
  queryParams.signature = signature;
  
  // Create curl command with proper authentication
  // Build query string manually to avoid URL encoding the signature
  const queryString = Object.keys(queryParams)
    .sort()
    .map(key => {
      if (key === 'signature') {
        // Don't URL encode the signature
        return `${key}=${queryParams[key]}`;
      } else {
        return `${key}=${encodeURIComponent(queryParams[key])}`;
      }
    })
    .join('&');
  
  // Escape single quotes in the body for shell safety
  const escapedBody = body.replace(/'/g, "'\"'\"'");
  
  return `curl -L 'https://ps.pndsn.com${uri}?${queryString}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: text/javascript' \\
  --data-raw '${escapedBody}'`;
}

// Helper function to generate curl command for revoke token
export async function generateRevokeTokenCurl(
  subscribeKey: string,
  publishKey: string,
  secretKey: string,
  token: string
): Promise<string> {
  // Generate current Unix timestamp - PubNub requires this to be within ±60 seconds of NTP time
  const timestamp = Math.floor(Date.now() / 1000);
  const uri = `/v3/pam/${subscribeKey}/revoke`;
  
  const queryParams: Record<string, string> = {
    timestamp: timestamp.toString(),
    uuid: 'access-manager-admin'
  };
  
  const requestBody = {
    token: token
  };
  
  const body = JSON.stringify(requestBody);
  
  // Generate signature for authentication
  const signature = await generateSignature(subscribeKey, publishKey, 'POST', uri, queryParams, body, secretKey);
  queryParams.signature = signature;
  
  // Build query string manually to avoid URL encoding the signature
  const queryString = Object.keys(queryParams)
    .sort()
    .map(key => {
      if (key === 'signature') {
        // Don't URL encode the signature
        return `${key}=${queryParams[key]}`;
      } else {
        return `${key}=${encodeURIComponent(queryParams[key])}`;
      }
    })
    .join('&');
  
  // Escape single quotes in the body for shell safety
  const escapedBody = body.replace(/'/g, "'\"'\"'");
  
  return `curl -L 'https://ps.pndsn.com${uri}?${queryString}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: text/javascript' \\
  --data-raw '${escapedBody}'`;
}