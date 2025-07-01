import { useState, useEffect } from 'react';
import { 
  Code, 
  Clock, 
  Globe, 
  Settings, 
  Database,
  ArrowRight,
  Monitor,
  Activity,
  Zap,
  ExternalLink,
  Book,
  X,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'functions.selectedFunction': { section: 'functions', field: 'selectedFunction', type: 'string', default: 'message-enricher' },
} as const;

// Module documentation data
const MODULE_DOCS = {
  'kvstore': {
    name: 'KV Store',
    description: 'Key-Value Storage for persistent data',
    overview: 'The kvstore module provides globally-distributed, persistent storage for your serverless code. Perfect for storing state, counters, configuration, and cached data.',
    methods: [
      { name: 'set(key, value, ttlMinutes?)', description: 'Store data with optional TTL' },
      { name: 'get(key)', description: 'Retrieve stored data' },
      { name: 'removeItem(key)', description: 'Delete stored data' },
      { name: 'incrCounter(key, increment?)', description: 'Atomically increment counters' },
      { name: 'getCounter(key)', description: 'Get current counter value' },
      { name: 'getKeys(paginationKey?)', description: 'List all stored keys' }
    ],
    example: `const db = require('kvstore');

// Store user preferences
await db.set("user:123", { 
  theme: "dark", 
  notifications: true 
}, 1440); // 24 hour TTL

// Increment page views atomically
const views = await db.incrCounter("page_views");

// Retrieve data
const userData = await db.get("user:123");`
  },
  'xhr': {
    name: 'XHR (HTTP Requests)',
    description: 'Make HTTP requests to external APIs',
    overview: 'The xhr module allows your Functions to make outbound HTTP/HTTPS requests to external APIs, webhooks, and services.',
    methods: [
      { name: 'fetch(url, options?)', description: 'Make HTTP requests with optional configuration' }
    ],
    example: `const xhr = require('xhr');

// GET request
const response = await xhr.fetch('https://api.example.com/data');
const data = JSON.parse(response.body);

// POST with JSON
const result = await xhr.fetch('https://api.example.com/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello World' })
});`
  },
  'vault': {
    name: 'Vault',
    description: 'Secure storage for sensitive information',
    overview: 'The vault module provides secure storage for sensitive data like API keys, tokens, and secrets that should not be hardcoded.',
    methods: [
      { name: 'get(key)', description: 'Retrieve secret securely' }
    ],
    example: `const vault = require('vault');

// Retrieve API key securely
const apiKey = await vault.get("github_api_token");
if (!apiKey) {
  throw new Error("API key not configured");
}

// Use in HTTP request
const response = await xhr.fetch(url, {
  headers: { 'Authorization': \`Bearer \${apiKey}\` }
});`
  },
  'pubnub': {
    name: 'PubNub',
    description: 'Core PubNub client for messaging',
    overview: 'The pubnub module provides direct access to PubNub messaging APIs including publish, fire, signals, and App Context operations.',
    methods: [
      { name: 'publish(params)', description: 'Send messages to channels' },
      { name: 'fire(params)', description: 'Trigger Functions without delivering to subscribers' },
      { name: 'signal(params)', description: 'Send lightweight real-time signals' },
      { name: 'objects.setUUIDMetadata(params)', description: 'Manage user metadata' },
      { name: 'objects.setChannelMetadata(params)', description: 'Manage channel metadata' },
      { name: 'listFiles(params)', description: 'List uploaded files' }
    ],
    example: `const pubnub = require('pubnub');

// Publish message
await pubnub.publish({
  channel: "alerts",
  message: { 
    type: "notification", 
    text: "System update complete" 
  }
});

// Fire analytics event
await pubnub.fire({
  channel: "analytics",
  message: { event: "user_action", timestamp: Date.now() }
});`
  },
  'crypto': {
    name: 'Crypto',
    description: 'Cryptographic functions and hashing',
    overview: 'The crypto module provides cryptographic operations including HMAC signatures, hashing, and data verification.',
    methods: [
      { name: 'hmac(key, data, algorithm)', description: 'Generate HMAC signatures' },
      { name: 'sha256(data)', description: 'SHA-256 hash generation' },
      { name: 'ALGORITHM.HMAC_SHA256', description: 'Algorithm constant for HMAC' }
    ],
    example: `const crypto = require('crypto');

// Generate HMAC signature
const signature = await crypto.hmac(
  'secretKey', 
  'data', 
  crypto.ALGORITHM.HMAC_SHA256
);

// Hash data
const hash = await crypto.sha256('hello world');
console.log('SHA-256 hash:', hash);`
  },
  'utils': {
    name: 'Utils',
    description: 'General utility functions',
    overview: 'The utils module provides helpful utility functions for common operations like random number generation and data validation.',
    methods: [
      { name: 'generateRandom()', description: 'Generate random numbers' },
      { name: 'isNumber(value)', description: 'Check if value is a number' }
    ],
    example: `const utils = require('utils');

// Generate random number
const randomValue = utils.generateRandom();

// Validate input
if (utils.isNumber(request.message.amount)) {
  // Process numeric amount
}`
  },
  'uuid': {
    name: 'UUID',
    description: 'UUID generation and validation',
    overview: 'The uuid module provides UUID generation and validation capabilities for creating unique identifiers.',
    methods: [
      { name: 'v4()', description: 'Generate random UUID v4' },
      { name: 'validate(uuid)', description: 'Validate UUID format' }
    ],
    example: `const { v4, validate } = require('uuid');

// Generate new UUID
const id = v4();
console.log('New UUID:', id);

// Validate UUID
if (validate(request.message.userId)) {
  console.log('Valid UUID provided');
}`
  },
  'jwt': {
    name: 'JWT',
    description: 'JSON Web Token operations',
    overview: 'The jwt module enables creation and verification of JSON Web Tokens for authentication and authorization.',
    methods: [
      { name: 'sign(payload, secret)', description: 'Create signed JWT tokens' },
      { name: 'verify(token, secret)', description: 'Verify and decode JWT tokens' }
    ],
    example: `const jwt = require('jwt');

// Create JWT token
const token = await jwt.sign(
  { userId: '123', role: 'admin' },
  'your-secret-key'
);

// Verify token
const decoded = await jwt.verify(token, 'your-secret-key');
console.log('User ID:', decoded.userId);`
  },
  'codec/*': {
    name: 'Codec Modules',
    description: 'Encoding/decoding utilities',
    overview: 'The codec modules provide various encoding and decoding utilities including Base64, authentication headers, and query string parsing.',
    methods: [
      { name: 'codec/base64.encode(data)', description: 'Base64 encode data' },
      { name: 'codec/base64.decode(data)', description: 'Base64 decode data' },
      { name: 'codec/auth.basic(user, pass)', description: 'Generate basic auth header' },
      { name: 'codec/query_string.parse(qs)', description: 'Parse query parameters' }
    ],
    example: `const base64 = require('codec/base64');
const auth = require('codec/auth');

// Base64 encoding
const encoded = base64.encode('Hello World');

// Basic auth header
const authHeader = auth.basic('username', 'password');

// Use in HTTP request
const response = await xhr.fetch(url, {
  headers: { 'Authorization': authHeader }
});`
  },
  'advanced_math': {
    name: 'Advanced Math',
    description: 'Mathematical and geospatial functions',
    overview: 'The advanced_math module provides mathematical operations and geospatial calculations for location-based applications.',
    methods: [
      { name: 'distance(lat1, lon1, lat2, lon2)', description: 'Calculate distance between coordinates' },
      { name: 'radians(degrees)', description: 'Convert degrees to radians' },
      { name: 'degrees(radians)', description: 'Convert radians to degrees' }
    ],
    example: `const math = require('advanced_math');

// Calculate distance between two points
const distance = math.distance(
  40.7128, -74.0060, // New York
  34.0522, -118.2437  // Los Angeles
);

console.log('Distance:', distance, 'km');`
  },
  'jsonpath': {
    name: 'JSONPath',
    description: 'Complex JSON data queries',
    overview: 'The jsonpath module enables complex queries and transformations on JSON data using JSONPath expressions.',
    methods: [
      { name: 'query(data, path)', description: 'Query JSON data with JSONPath expressions' }
    ],
    example: `const jsonpath = require('jsonpath');

const data = {
  users: [
    { name: 'Alice', age: 30, active: true },
    { name: 'Bob', age: 25, active: false }
  ]
};

// Find all active users
const activeUsers = jsonpath.query(data, '$.users[?(@.active)]');
console.log('Active users:', activeUsers);`
  }
};

// Function Type documentation data
const FUNCTION_TYPE_DOCS = {
  'before-publish': {
    name: 'Before Publish',
    description: 'Transform or validate messages before they are published',
    overview: 'Before Publish Functions execute before a message is delivered to subscribers. They can modify, enrich, or block messages. Perfect for content filtering, message transformation, and validation.',
    useCases: [
      'Content moderation and filtering',
      'Message enrichment with additional data',
      'Data validation and sanitization',
      'Rate limiting and spam detection',
      'Adding timestamps and metadata'
    ],
    parameters: [
      { name: 'request.message', description: 'The message payload being published' },
      { name: 'request.channels', description: 'Array of channels the message is being sent to' },
      { name: 'request.ok()', description: 'Call to allow the message to be published' },
      { name: 'request.abort()', description: 'Call to block the message from being published' }
    ],
    example: `// BUSINESS PURPOSE: Content moderation and message enrichment system for chat applications
// This function acts as a comprehensive chat message processor that validates users, 
// prevents spam and inappropriate content, enriches messages with user data, and 
// maintains rate limiting to ensure platform quality and safety.

export default async (request) => {
  const db = require('kvstore');
  const crypto = require('crypto');
  const xhr = require('xhr');
  const vault = require('vault');
  
  try {
    const message = request.message;
    const channel = request.channels[0];
    const userId = message.userId;
    
    // Validate required fields
    if (!userId || !message.text) {
      console.error('Invalid message format - missing userId or text');
      return request.abort();
    }
    
    // Parallel validation and enrichment operations
    const [userProfile, rateLimitCount, moderationKey] = await Promise.all([
      db.get(\`user_profile:\${userId}\`),
      db.getCounter(\`rate_limit:\${userId}:\${Math.floor(Date.now() / 60000)}\`),
      vault.get('content_moderation_api_key')
    ]);
    
    // Rate limiting with user tier support
    const userTier = userProfile?.tier || 'free';
    const rateLimits = {
      free: 10,
      premium: 50,
      enterprise: 200
    };
    const maxMessages = rateLimits[userTier];
    
    if (rateLimitCount >= maxMessages) {
      console.log(\`Rate limit exceeded for \${userTier} user \${userId}: \${rateLimitCount}/\${maxMessages}\`);
      
      // Add rate limit info to message for client handling
      message.rateLimited = true;
      message.retryAfter = 60 - (Date.now() % 60000) / 1000;
      return request.abort();
    }
    
    // Content moderation with external API
    let moderationPassed = true;
    if (moderationKey && message.text.length > 10) {
      try {
        const moderationResponse = await xhr.fetch('https://api.moderatehatespeech.com/v1/moderate/', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${moderationKey}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: message.text })
        });
        
        if (moderationResponse.status === 200) {
          const moderationResult = JSON.parse(moderationResponse.body);
          moderationPassed = moderationResult.class === 'NOT_HATE';
          
          // Add moderation metadata
          message.moderation = {
            confidence: moderationResult.confidence,
            checked: true,
            timestamp: Date.now()
          };
        }
      } catch (moderationError) {
        console.error('Moderation API error:', moderationError);
        // Continue with basic keyword filtering on API failure
      }
    }
    
    // Fallback content filtering
    if (moderationPassed) {
      const profanityWords = ['spam', 'blocked', 'hate', 'toxic'];
      const messageText = message.text.toLowerCase();
      moderationPassed = !profanityWords.some(word => messageText.includes(word));
    }
    
    if (!moderationPassed) {
      console.log(\`Message blocked due to inappropriate content from user \${userId}\`);
      
      // Log moderation event
      await db.set(\`moderation_event:\${Date.now()}:\${userId}\`, {
        userId: userId,
        channel: channel,
        messagePreview: message.text.substring(0, 50) + '...',
        reason: 'content_violation',
        timestamp: Date.now()
      }, 10080); // 7 days TTL
      
      return request.abort();
    }
    
    // Message enrichment with parallel operations
    const enrichmentPromises = [
      db.incrCounter(\`rate_limit:\${userId}:\${Math.floor(Date.now() / 60000)}\`),
      db.incrCounter('total_messages_processed'),
      db.incrCounter(\`messages_per_channel:\${channel}\`),
      crypto.sha256(JSON.stringify({ text: message.text, userId, timestamp: Date.now() }))
    ];
    
    const [, , , messageHash] = await Promise.all(enrichmentPromises);
    
    // Enhanced message metadata
    message.messageId = messageHash.substring(0, 12);
    message.processedAt = new Date().toISOString();
    message.channel = channel;
    message.userTier = userTier;
    message.processingLatency = Date.now() - (message.clientTimestamp || Date.now());
    
    // Add user context if available
    if (userProfile) {
      message.author = {
        displayName: userProfile.displayName,
        avatar: userProfile.avatar,
        verified: userProfile.verified || false
      };
    }
    
    // Track message analytics
    const today = new Date().toISOString().split('T')[0];
    await Promise.all([
      db.incrCounter(\`daily_messages:\${today}\`),
      db.incrCounter(\`user_daily_messages:\${userId}:\${today}\`)
    ]);
    
    console.log(\`Message processed: \${message.messageId} from \${userTier} user \${userId} on \${channel}\`);
    return request.ok();
    
  } catch (error) {
    console.error('Error processing message:', error);
    
    // Add error context for debugging
    message.processingError = {
      error: error.message,
      timestamp: Date.now(),
      functionVersion: '2.0'
    };
    
    return request.abort();
  }
};`
  },
  'after-publish': {
    name: 'After Publish',
    description: 'Process messages after they have been published',
    overview: 'After Publish Functions execute after a message has been delivered to subscribers. They cannot modify the original message but can trigger additional actions, analytics, or notifications.',
    useCases: [
      'Analytics and message tracking',
      'Triggering workflows and notifications',
      'Database logging and archival',
      'Third-party integrations',
      'Audit trails and compliance'
    ],
    parameters: [
      { name: 'request.message', description: 'The published message payload (read-only)' },
      { name: 'request.channels', description: 'Array of channels the message was sent to' },
      { name: 'request.ok()', description: 'Call to complete processing successfully' },
      { name: 'request.abort()', description: 'Call to stop further processing' }
    ],
    example: `// BUSINESS PURPOSE: Post-delivery analytics and workflow automation system
// This function processes published messages to track engagement metrics, create audit trails 
// for compliance, and automatically trigger business workflows like urgent notifications 
// and third-party integrations based on message content and priority.

export default async (request) => {
  const db = require('kvstore');
  const xhr = require('xhr');
  const pubnub = require('pubnub');
  
  try {
    const message = request.message;
    const channel = request.channels[0];
    
    // Analytics tracking
    const today = new Date().toISOString().split('T')[0];
    await db.incrCounter(\`messages_per_day:\${today}\`);
    await db.incrCounter(\`channel_activity:\${channel}\`);
    
    // Store message for compliance/audit
    const auditRecord = {
      messageId: message.messageId,
      channel: channel,
      timestamp: Date.now(),
      userId: message.userId,
      messageSize: JSON.stringify(message).length
    };
    
    await db.set(\`audit:\${message.messageId}\`, auditRecord, 10080); // 7 days
    
    // Trigger notifications for important messages
    if (message.priority === 'urgent') {
      // Send to notification service
      await xhr.fetch('https://api.slack.com/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: \`🚨 Urgent message in \${channel}: \${message.text}\`,
          channel: '#alerts'
        })
      });
      
      // Fire internal alert
      await pubnub.fire({
        channel: 'internal_alerts',
        message: {
          type: 'urgent_message',
          originalChannel: channel,
          messageId: message.messageId,
          timestamp: Date.now()
        }
      });
    }
    
    // Log successful processing
    console.log(\`Post-processing completed for message \${message.messageId}\`);
    return request.ok();
    
  } catch (error) {
    console.error('Error in post-processing:', error);
    return request.ok(); // Continue even if post-processing fails
  }
};`
  },
  'after-presence': {
    name: 'After Presence',
    description: 'React to presence events (join, leave, timeout)',
    overview: 'After Presence Functions execute when users join, leave, or timeout from channels. Perfect for tracking user activity, managing sessions, and triggering presence-based workflows.',
    useCases: [
      'User session management',
      'Activity tracking and analytics',
      'Welcome messages for new users',
      'Cleanup tasks when users leave',
      'Real-time user count updates'
    ],
    parameters: [
      { name: 'request.message', description: 'Presence event data (action, uuid, timestamp)' },
      { name: 'request.channels', description: 'Array of channels where presence occurred' },
      { name: 'request.message.action', description: 'Presence action: "join", "leave", or "timeout"' },
      { name: 'request.message.uuid', description: 'User ID that triggered the presence event' }
    ],
    example: `// BUSINESS PURPOSE: User session management and engagement tracking system
// This function manages user presence in your application by tracking when users join/leave
// channels, sending personalized welcome messages to new users, maintaining real-time 
// occupancy counts, and creating analytics for user engagement patterns.

export default async (request) => {
  const db = require('kvstore');
  const pubnub = require('pubnub');
  
  try {
    const presenceEvent = request.message;
    const channel = request.channels[0];
    const userId = presenceEvent.uuid;
    const action = presenceEvent.action;
    
    console.log(\`Presence event: \${userId} \${action} \${channel}\`);
    
    switch (action) {
      case 'join':
        // Track user session start
        await db.set(\`session:\${userId}:\${channel}\`, {
          joinedAt: Date.now(),
          channel: channel,
          lastSeen: Date.now()
        }, 1440); // 24 hour TTL
        
        // Increment active user count
        await db.incrCounter(\`active_users:\${channel}\`);
        
        // Send welcome message for new users
        const userHistory = await db.get(\`user_history:\${userId}\`);
        if (!userHistory) {
          await pubnub.publish({
            channel: channel,
            message: {
              type: 'welcome',
              text: \`Welcome to \${channel}! 👋\`,
              userId: userId,
              timestamp: Date.now()
            }
          });
          
          // Mark user as seen before
          await db.set(\`user_history:\${userId}\`, { firstSeen: Date.now() }, 43200); // 30 days
        }
        
        // Update channel statistics
        await db.incrCounter('total_joins');
        break;
        
      case 'leave':
      case 'timeout':
        // Clean up user session
        await db.removeItem(\`session:\${userId}:\${channel}\`);
        
        // Decrement active user count
        await db.incrCounter(\`active_users:\${channel}\`, -1);
        
        // Log session duration if we have join time
        const sessionData = await db.get(\`session:\${userId}:\${channel}\`);
        if (sessionData) {
          const sessionDuration = Date.now() - sessionData.joinedAt;
          await db.incrCounter('total_session_time', Math.floor(sessionDuration / 1000));
        }
        
        // Fire analytics event
        await pubnub.fire({
          channel: 'presence_analytics',
          message: {
            type: 'user_left',
            userId: userId,
            channel: channel,
            action: action,
            timestamp: Date.now()
          }
        });
        break;
    }
    
    // Update real-time presence dashboard
    const currentCount = await db.getCounter(\`active_users:\${channel}\`) || 0;
    await pubnub.signal({
      channel: \`presence_updates.\${channel}\`,
      message: { count: currentCount, action: action, userId: userId }
    });
    
    return request.ok();
    
  } catch (error) {
    console.error('Error processing presence event:', error);
    return request.ok();
  }
};`
  },
  'on-request': {
    name: 'On Request',
    description: 'Create RESTful endpoints with custom logic',
    overview: 'On Request Functions create HTTP endpoints that can be called directly via REST API. They receive HTTP requests and can return custom responses, perfect for webhooks, APIs, and server-side logic.',
    useCases: [
      'Webhook endpoints for third-party services',
      'RESTful APIs for mobile/web apps',
      'Data processing and transformation',
      'Authentication and authorization',
      'Integration with external databases'
    ],
    parameters: [
      { name: 'request.params', description: 'URL path parameters' },
      { name: 'request.query', description: 'Query string parameters' },
      { name: 'request.body', description: 'Request body content' },
      { name: 'request.headers', description: 'HTTP request headers' },
      { name: 'response.send(data, statusCode)', description: 'Send JSON response with status code' }
    ],
    example: `// BUSINESS PURPOSE: Multi-purpose API gateway with authentication and webhook processing
// This function creates a secure, scalable API endpoint that handles multiple business operations
// including system health monitoring, user data management, webhook processing from external services,
// and notification delivery - all with built-in authentication, rate limiting, and comprehensive logging.

export default async (request, response) => {
  const db = require('kvstore');
  const xhr = require('xhr');
  const vault = require('vault');
  const pubnub = require('pubnub');
  const crypto = require('crypto');
  const jwt = require('jwt');
  
  try {
    const method = request.method || 'GET';
    const path = request.params.path || '';
    const requestId = crypto.sha256(\`\${Date.now()}-\${Math.random()}\`).substring(0, 8);
    
    console.log(\`[\${requestId}] \${method} /\${path} - Starting request processing\`);
    
    // CORS headers for browser requests
    response.headers['Access-Control-Allow-Origin'] = '*';
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key';
    response.headers['X-Request-ID'] = requestId;
    
    // Handle preflight requests
    if (method === 'OPTIONS') {
      return response.send('', 200);
    }
    
    // Rate limiting per IP/client
    const clientIP = request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown';
    const rateLimitKey = \`api_rate_limit:\${clientIP}:\${Math.floor(Date.now() / 60000)}\`; // per minute
    const requestCount = await db.incrCounter(rateLimitKey);
    
    if (requestCount > 100) { // 100 requests per minute per IP
      console.log(\`[\${requestId}] Rate limit exceeded for IP: \${clientIP}\`);
      return response.send({ 
        error: 'Rate limit exceeded',
        retryAfter: 60,
        requestId: requestId
      }, 429);
    }
    
    // Set TTL for rate limit cleanup
    if (requestCount === 1) {
      await db.set(\`\${rateLimitKey}_ttl\`, Date.now(), 2); // 2 minute TTL
    }
    
    // Enhanced authentication with JWT support
    const authResult = await authenticateRequest(request, vault, jwt);
    if (!authResult.success) {
      console.log(\`[\${requestId}] Authentication failed: \${authResult.error}\`);
      return response.send({ 
        error: authResult.error,
        requestId: requestId
      }, authResult.statusCode);
    }
    
    const { userId, permissions } = authResult;
    
    // Route handling with permission checks
    switch (method) {
      case 'GET':
        if (path === 'stats') {
          if (!permissions.includes('read:stats')) {
            return response.send({ error: 'Insufficient permissions' }, 403);
          }
          
          // Parallel fetch of statistics
          const [totalMessages, activeUsers, systemHealth, dailyStats] = await Promise.all([
            db.getCounter('total_messages_processed'),
            db.getCounter('total_active_users'),
            db.get('system_health'),
            db.get(\`daily_stats:\${new Date().toISOString().split('T')[0]}\`)
          ]);
          
          const stats = {
            totalMessages: totalMessages || 0,
            activeUsers: activeUsers || 0,
            systemHealth: systemHealth || { status: 'unknown' },
            dailyStats: dailyStats || { messages: 0, users: 0 },
            uptime: systemHealth?.uptime || 'unknown',
            timestamp: Date.now(),
            requestId: requestId
          };
          
          // Log stats access
          await db.incrCounter('api_stats_requests');
          
          return response.send(stats, 200);
          
        } else if (path === 'health') {
          // Enhanced health check with dependency verification
          const healthChecks = await Promise.allSettled([
            db.get('system_health'),
            vault.get('health_check_enabled'),
            pubnub.publish({ 
              channel: 'health_check_test', 
              message: { test: true, timestamp: Date.now() }
            })
          ]);
          
          const health = {
            status: healthChecks.every(check => check.status === 'fulfilled') ? 'healthy' : 'degraded',
            checks: {
              kvstore: healthChecks[0].status === 'fulfilled' ? 'ok' : 'error',
              vault: healthChecks[1].status === 'fulfilled' ? 'ok' : 'error',
              pubnub: healthChecks[2].status === 'fulfilled' ? 'ok' : 'error'
            },
            timestamp: Date.now(),
            version: '2.0.0',
            requestId: requestId
          };
          
          const statusCode = health.status === 'healthy' ? 200 : 503;
          return response.send(health, statusCode);
          
        } else if (path.startsWith('user/')) {
          const targetUserId = path.split('/')[1];
          
          if (!permissions.includes('read:users') && userId !== targetUserId) {
            return response.send({ error: 'Insufficient permissions' }, 403);
          }
          
          const userData = await db.get(\`user_profile:\${targetUserId}\`);
          if (!userData) {
            return response.send({ error: 'User not found' }, 404);
          }
          
          return response.send({ user: userData, requestId: requestId }, 200);
          
        } else {
          return response.send({ 
            error: 'Endpoint not found',
            availableEndpoints: ['stats', 'health', 'user/{id}'],
            requestId: requestId
          }, 404);
        }
        
      case 'POST':
        if (path === 'webhook') {
          // Enhanced webhook processing with signature verification
          const webhookSecret = await vault.get('webhook_secret');
          const signature = request.headers['x-webhook-signature'];
          const body = request.body;
          
          if (webhookSecret && signature) {
            const expectedSignature = await crypto.hmac(webhookSecret, body, crypto.ALGORITHM.HMAC_SHA256);
            const expectedHeader = \`sha256=\${expectedSignature}\`;
            
            if (signature !== expectedHeader) {
              console.log(\`[\${requestId}] Webhook signature verification failed\`);
              return response.send({ error: 'Invalid signature' }, 401);
            }
          }
          
          let webhookData;
          try {
            webhookData = JSON.parse(body);
          } catch (parseError) {
            return response.send({ 
              error: 'Invalid JSON payload',
              requestId: requestId
            }, 400);
          }
          
          // Store webhook with enhanced metadata
          const webhookId = \`webhook:\${Date.now()}:\${requestId}\`;
          await db.set(webhookId, {
            data: webhookData,
            metadata: {
              source: request.headers['user-agent'] || 'unknown',
              ip: clientIP,
              timestamp: Date.now(),
              requestId: requestId,
              verified: !!webhookSecret
            }
          }, 1440); // 24 hours
          
          // Parallel processing: store + publish + analytics
          await Promise.all([
            pubnub.publish({
              channel: 'webhook_events',
              message: {
                type: 'external_webhook',
                id: webhookId,
                data: webhookData,
                metadata: { requestId, verified: !!webhookSecret },
                timestamp: Date.now()
              }
            }),
            db.incrCounter('webhooks_processed'),
            db.incrCounter(\`webhooks_daily:\${new Date().toISOString().split('T')[0]}\`)
          ]);
          
          return response.send({ 
            status: 'processed',
            webhookId: webhookId,
            requestId: requestId
          }, 200);
          
        } else if (path === 'notify') {
          if (!permissions.includes('send:notifications')) {
            return response.send({ error: 'Insufficient permissions' }, 403);
          }
          
          let notificationData;
          try {
            notificationData = JSON.parse(request.body);
          } catch (parseError) {
            return response.send({ 
              error: 'Invalid JSON payload',
              requestId: requestId
            }, 400);
          }
          
          const { channel, message, priority, recipients } = notificationData;
          
          // Enhanced validation
          if (!channel || !message) {
            return response.send({ 
              error: 'Missing required fields: channel, message',
              requestId: requestId
            }, 400);
          }
          
          if (message.length > 500) {
            return response.send({ 
              error: 'Message too long (max 500 characters)',
              requestId: requestId
            }, 400);
          }
          
          const notificationId = \`notification:\${Date.now()}:\${requestId}\`;
          const notification = {
            id: notificationId,
            text: message,
            priority: priority || 'normal',
            recipients: recipients || 'all',
            sender: userId,
            timestamp: Date.now(),
            source: 'api',
            requestId: requestId
          };
          
          // Send notification and track delivery
          await Promise.all([
            pubnub.publish({ channel, message: notification }),
            db.set(notificationId, notification, 168), // 7 days
            db.incrCounter('notifications_sent'),
            db.incrCounter(\`notifications_by_priority:\${priority || 'normal'}\`)
          ]);
          
          return response.send({ 
            status: 'sent',
            notificationId: notificationId,
            channel: channel,
            requestId: requestId
          }, 200);
          
        } else {
          return response.send({ 
            error: 'Endpoint not found',
            requestId: requestId
          }, 404);
        }
        
      default:
        return response.send({ 
          error: \`Method \${method} not allowed\`,
          allowedMethods: ['GET', 'POST', 'OPTIONS'],
          requestId: requestId
        }, 405);
    }
    
  } catch (error) {
    console.error(\`API endpoint error [\${requestId}]:\`, error);
    
    // Enhanced error logging
    await db.set(\`api_error:\${Date.now()}\`, {
      requestId: requestId,
      method: request.method,
      path: request.params.path,
      error: error.message,
      stack: error.stack,
      timestamp: Date.now()
    }, 1440); // 24 hours
    
    return response.send({ 
      error: 'Internal server error',
      requestId: requestId,
      timestamp: Date.now()
    }, 500);
  }
};

// Helper function for authentication
async function authenticateRequest(request, vault, jwt) {
  const authHeader = request.headers['authorization'];
  const apiKey = request.headers['x-api-key'];
  
  try {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // JWT authentication
      const token = authHeader.replace('Bearer ', '');
      const jwtSecret = await vault.get('jwt_secret');
      
      if (!jwtSecret) {
        return { success: false, error: 'JWT not configured', statusCode: 500 };
      }
      
      const decoded = await jwt.verify(token, jwtSecret);
      return { 
        success: true, 
        userId: decoded.userId,
        permissions: decoded.permissions || ['read:basic']
      };
      
    } else if (apiKey) {
      // API Key authentication
      const validApiKey = await vault.get('api_access_token');
      
      if (apiKey !== validApiKey) {
        return { success: false, error: 'Invalid API key', statusCode: 401 };
      }
      
      return { 
        success: true, 
        userId: 'api_user',
        permissions: ['read:stats', 'read:users', 'send:notifications']
      };
      
    } else {
      return { success: false, error: 'Authentication required', statusCode: 401 };
    }
  } catch (authError) {
    return { success: false, error: 'Authentication failed', statusCode: 401 };
  }
}`
  },
  'on-interval': {
    name: 'On Interval',
    description: 'Execute code on a scheduled time interval',
    overview: 'On Interval Functions execute periodically based on a time schedule (e.g., every 5 minutes, hourly, daily). They are perfect for background tasks, data aggregation, cleanup operations, and health monitoring that need to run automatically without being triggered by messages.',
    useCases: [
      'Periodic data cleanup and maintenance',
      'Scheduled data aggregation and reporting',
      'Health checks and system monitoring',
      'Batch processing and data synchronization',
      'Cache warming and optimization tasks'
    ],
    parameters: [
      { name: 'event.ok()', description: 'Call to complete the scheduled execution successfully' },
      { name: 'event.abort()', description: 'Call to signal an error during scheduled execution' },
      { name: 'No incoming message', description: 'Interval functions do not receive message data' },
      { name: 'Schedule configuration', description: 'Interval timing is set in the PubNub portal (milliseconds)' }
    ],
    example: `// BUSINESS PURPOSE: Automated maintenance and business intelligence system
// This function runs scheduled maintenance tasks including data cleanup, daily analytics
// aggregation, external service health monitoring, and automated reporting. It ensures
// your application stays healthy and provides regular business insights without manual intervention.

export default async (event) => {
  const db = require('kvstore');
  const xhr = require('xhr');
  const pubnub = require('pubnub');
  
  try {
    console.log('Scheduled maintenance task started at:', new Date().toISOString());
    
    // 1. Clean up expired temporary data
    const allKeys = await db.getKeys();
    const tempKeys = allKeys.filter(key => key.startsWith('temp:'));
    let cleanedCount = 0;
    
    for (const key of tempKeys) {
      const data = await db.get(key);
      if (!data) continue; // Already expired
      
      // Check if temp data is older than 1 hour
      if (data.createdAt && Date.now() - new Date(data.createdAt).getTime() > 3600000) {
        await db.removeItem(key);
        cleanedCount++;
      }
    }
    
    console.log(\`Cleaned up \${cleanedCount} expired temporary items\`);
    
    // 2. Aggregate daily statistics
    const today = new Date().toISOString().split('T')[0];
    const statsKeys = allKeys.filter(key => key.startsWith('daily_stats:'));
    
    let totalMessages = 0;
    let totalUsers = 0;
    
    for (const key of statsKeys) {
      const count = await db.getCounter(key);
      if (key.includes('messages')) totalMessages += count;
      if (key.includes('users')) totalUsers += count;
    }
    
    // Store aggregated daily report
    const dailyReport = {
      date: today,
      totalMessages: totalMessages,
      totalUsers: totalUsers,
      cleanupItemsRemoved: cleanedCount,
      reportGeneratedAt: new Date().toISOString()
    };
    
    await db.set(\`daily_report:\${today}\`, dailyReport, 10080); // 7 days TTL
    
    // 3. Health check external service
    try {
      const healthResponse = await xhr.fetch('https://api.example.com/health');
      const healthData = JSON.parse(healthResponse.body);
      
      await db.set('system_health', {
        status: healthData.status,
        uptime: healthData.uptime,
        lastCheck: new Date().toISOString()
      }, 60); // 1 hour TTL
      
      // Alert if system is unhealthy
      if (healthData.status !== 'healthy') {
        await pubnub.publish({
          channel: 'system_alerts',
          message: {
            type: 'health_alert',
            status: healthData.status,
            details: healthData.details,
            timestamp: Date.now(),
            source: 'scheduled_health_check'
          }
        });
      }
    } catch (healthError) {
      console.error('Health check failed:', healthError);
      
      await pubnub.publish({
        channel: 'system_alerts',
        message: {
          type: 'health_check_error',
          error: healthError.message,
          timestamp: Date.now(),
          source: 'scheduled_health_check'
        }
      });
    }
    
    // 4. Publish daily summary
    await pubnub.publish({
      channel: 'daily_reports',
      message: {
        type: 'daily_summary',
        report: dailyReport,
        timestamp: Date.now()
      }
    });
    
    console.log('Scheduled maintenance completed successfully');
    return event.ok();
    
  } catch (error) {
    console.error('Scheduled maintenance error:', error);
    
    // Publish error notification
    try {
      await pubnub.publish({
        channel: 'system_errors',
        message: {
          type: 'scheduled_function_error',
          function: 'maintenance_interval',
          error: error.message,
          timestamp: Date.now()
        }
      });
    } catch (publishError) {
      console.error('Failed to publish error notification:', publishError);
    }
    
    return event.abort();
  }
};`
  },
  'before-signal': {
    name: 'Before Signal',
    description: 'Transform or validate signals before they are sent',
    overview: 'Before Signal Functions execute before a signal is delivered to subscribers. Signals are lightweight, fast messages perfect for real-time indicators like typing notifications, user status, or live cursors. These functions can modify, enrich, or block signals before delivery.',
    useCases: [
      'Real-time typing indicators and user status',
      'Live cursor positions and collaborative editing',
      'Presence indicators and activity status',
      'Rate limiting for high-frequency signals',
      'Signal data validation and sanitization'
    ],
    parameters: [
      { name: 'request.message', description: 'The signal payload being sent (usually small data)' },
      { name: 'request.channels', description: 'Array of channels the signal is being sent to' },
      { name: 'request.ok()', description: 'Call to allow the signal to be delivered' },
      { name: 'request.abort()', description: 'Call to block the signal from being delivered' }
    ],
    example: `// BUSINESS PURPOSE: Real-time interaction validation and enhancement system
// This function processes lightweight signals like typing indicators, cursor movements, 
// and user status changes to ensure data quality, prevent abuse through rate limiting,
// and enhance real-time user interactions with additional context and validation.

export default async (request) => {
  const db = require('kvstore');
  const pubnub = require('pubnub');
  
  try {
    const signal = request.message;
    const channel = request.channels[0];
    const userId = signal.userId;
    
    console.log(\`Processing signal from user \${userId} on channel \${channel}\`);
    
    // Validate signal data
    if (!signal.type || !userId) {
      console.error('Invalid signal format - missing type or userId');
      return request.abort();
    }
    
    // Rate limiting for signals (higher limit than messages)
    const rateLimitKey = \`signal_rate_limit:\${userId}:\${Math.floor(Date.now() / 60000)}\`;
    const signalCount = await db.getCounter(rateLimitKey);
    
    // Allow more signals than messages (e.g., 100 signals per minute)
    if (signalCount >= 100) {
      console.log(\`Signal rate limit exceeded for user \${userId}: \${signalCount}/100\`);
      return request.abort();
    }
    
    // Increment signal counter with 2-minute TTL for cleanup
    await db.incrCounter(rateLimitKey);
    await db.set(\`\${rateLimitKey}_ttl\`, Date.now(), 2);
    
    // Process different signal types
    switch (signal.type) {
      case 'typing':
        // Typing indicator signals
        if (typeof signal.isTyping !== 'boolean') {
          console.error('Invalid typing signal format');
          return request.abort();
        }
        
        // Add timestamp for client-side timeout handling
        signal.timestamp = Date.now();
        signal.channel = channel;
        
        // Store typing state briefly for conflict resolution
        const typingKey = \`typing:\${channel}:\${userId}\`;
        if (signal.isTyping) {
          await db.set(typingKey, { 
            isTyping: true, 
            startedAt: Date.now() 
          }, 5); // 5 minute TTL
        } else {
          await db.removeItem(typingKey);
        }
        break;
        
      case 'cursor':
        // Live cursor position signals
        if (typeof signal.x !== 'number' || typeof signal.y !== 'number') {
          console.error('Invalid cursor position signal');
          return request.abort();
        }
        
        // Validate cursor bounds (example: within 0-1920x1080)
        if (signal.x < 0 || signal.x > 1920 || signal.y < 0 || signal.y > 1080) {
          console.log('Cursor position out of bounds, normalizing');
          signal.x = Math.max(0, Math.min(1920, signal.x));
          signal.y = Math.max(0, Math.min(1080, signal.y));
        }
        
        // Add movement timestamp
        signal.movedAt = Date.now();
        signal.channel = channel;
        break;
        
      case 'presence_status':
        // User status signals (online, away, busy, etc.)
        const validStatuses = ['online', 'away', 'busy', 'offline'];
        if (!validStatuses.includes(signal.status)) {
          console.error(\`Invalid presence status: \${signal.status}\`);
          return request.abort();
        }
        
        // Store user status for persistence
        await db.set(\`user_status:\${userId}\`, {
          status: signal.status,
          lastUpdate: Date.now(),
          channel: channel
        }, 1440); // 24 hour TTL
        
        // Add status change timestamp
        signal.statusChangedAt = Date.now();
        break;
        
      case 'live_reaction':
        // Live reactions (like, heart, etc.)
        const validReactions = ['👍', '❤️', '😂', '😢', '😮', '😡'];
        if (!validReactions.includes(signal.reaction)) {
          console.error(\`Invalid reaction: \${signal.reaction}\`);
          return request.abort();
        }
        
        // Track reaction for analytics
        const reactionKey = \`reactions:\${channel}:\${signal.reaction}\`;
        await db.incrCounter(reactionKey);
        
        // Add reaction metadata
        signal.reactedAt = Date.now();
        signal.channel = channel;
        break;
        
      default:
        console.log(\`Unknown signal type: \${signal.type}\`);
        // Allow unknown types to pass through
    }
    
    // Add signal processing metadata
    signal.processedAt = Date.now();
    signal.processingLatency = Date.now() - (signal.clientTimestamp || Date.now());
    
    // Track signal analytics
    await db.incrCounter('total_signals_processed');
    await db.incrCounter(\`signals_by_type:\${signal.type}\`);
    
    // Log high-frequency signals in batches for performance
    if (signalCount % 10 === 0) {
      console.log(\`Processed \${signalCount + 1} signals for user \${userId} this minute\`);
    }
    
    return request.ok();
    
  } catch (error) {
    console.error('Error processing signal:', error);
    
    // For signals, we typically want to fail fast rather than block
    // since they're meant to be lightweight and real-time
    return request.abort();
  }
};`
  },
  'after-signal': {
    name: 'After Signal',
    description: 'Process signals after they have been delivered',
    overview: 'After Signal Functions execute after a signal has been delivered to subscribers. Since signals are lightweight and real-time, these functions are perfect for analytics, logging, and triggering follow-up actions without affecting the signal delivery performance.',
    useCases: [
      'Signal analytics and usage tracking',
      'Logging real-time interaction patterns',
      'Triggering workflows based on signal activity',
      'Aggregating typing and presence statistics',
      'Performance monitoring for real-time features'
    ],
    parameters: [
      { name: 'request.message', description: 'The signal payload that was delivered (read-only)' },
      { name: 'request.channels', description: 'Array of channels the signal was sent to' },
      { name: 'request.ok()', description: 'Call to complete signal processing successfully' },
      { name: 'request.abort()', description: 'Call to stop further signal processing' }
    ],
    example: `// BUSINESS PURPOSE: Real-time interaction analytics and engagement tracking system
// This function analyzes delivered signals to generate business insights on user behavior,
// track engagement patterns, measure interaction performance, and create detailed analytics
// for typing patterns, cursor movements, and user activity trends.

export default async (request) => {
  const db = require('kvstore');
  const pubnub = require('pubnub');
  
  try {
    const signal = request.message;
    const channel = request.channels[0];
    const userId = signal.userId;
    
    console.log(\`Post-processing signal: \${signal.type} from user \${userId}\`);
    
    // Track signal analytics by type and time
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().getHours();
    
    // Increment various analytics counters
    await Promise.all([
      db.incrCounter('total_signals_delivered'),
      db.incrCounter(\`signals_by_type:\${signal.type}\`),
      db.incrCounter(\`signals_daily:\${today}\`),
      db.incrCounter(\`signals_hourly:\${today}:\${hour}\`),
      db.incrCounter(\`user_signals:\${userId}:\${today}\`)
    ]);
    
    // Process different signal types for analytics
    switch (signal.type) {
      case 'typing':
        // Track typing patterns and session analytics
        const typingSessionKey = \`typing_session:\${userId}:\${channel}\`;
        const typingSession = await db.get(typingSessionKey) || {
          startTime: Date.now(),
          keystrokes: 0,
          sessions: 0
        };
        
        if (signal.isTyping) {
          // User started typing
          if (!typingSession.currentSession) {
            typingSession.sessions += 1;
            typingSession.currentSession = {
              startedAt: Date.now(),
              keystrokes: 0
            };
          }
          typingSession.keystrokes += 1;
        } else {
          // User stopped typing
          if (typingSession.currentSession) {
            const sessionDuration = Date.now() - typingSession.currentSession.startedAt;
            
            // Store completed typing session
            await db.set(\`completed_typing_session:\${userId}:\${Date.now()}\`, {
              userId: userId,
              channel: channel,
              duration: sessionDuration,
              keystrokes: typingSession.currentSession.keystrokes,
              wordsPerMinute: Math.round((typingSession.currentSession.keystrokes / 5) / (sessionDuration / 60000)),
              completedAt: Date.now()
            }, 1440); // 24 hour TTL
            
            // Clear current session
            delete typingSession.currentSession;
          }
        }
        
        await db.set(typingSessionKey, typingSession, 1440);
        break;
        
      case 'cursor':
        // Track cursor movement patterns for UX analytics
        const cursorData = {
          userId: userId,
          channel: channel,
          x: signal.x,
          y: signal.y,
          timestamp: Date.now(),
          sessionId: signal.sessionId
        };
        
        // Store recent cursor positions for heatmap generation
        const cursorKey = \`cursor_tracking:\${channel}:\${Math.floor(Date.now() / 300000)}\`; // 5-minute buckets
        const cursorHistory = await db.get(cursorKey) || { positions: [] };
        cursorHistory.positions.push(cursorData);
        
        // Keep only last 100 positions per bucket to manage size
        if (cursorHistory.positions.length > 100) {
          cursorHistory.positions = cursorHistory.positions.slice(-100);
        }
        
        await db.set(cursorKey, cursorHistory, 30); // 30 minute TTL
        
        // Track cursor movement velocity for engagement metrics
        const lastCursorKey = \`last_cursor:\${userId}:\${channel}\`;
        const lastCursor = await db.get(lastCursorKey);
        
        if (lastCursor) {
          const distance = Math.sqrt(
            Math.pow(signal.x - lastCursor.x, 2) + 
            Math.pow(signal.y - lastCursor.y, 2)
          );
          const timeDiff = Date.now() - lastCursor.timestamp;
          const velocity = distance / (timeDiff / 1000); // pixels per second
          
          await db.incrCounter(\`cursor_movements:\${userId}:\${today}\`);
          
          // Store high-velocity movements as engagement indicators
          if (velocity > 100) { // Fast movements
            await db.incrCounter(\`high_engagement_movements:\${today}\`);
          }
        }
        
        await db.set(lastCursorKey, cursorData, 10); // 10 minute TTL
        break;
        
      case 'presence_status':
        // Track presence changes and user activity patterns
        const statusChangeKey = \`status_change:\${userId}:\${Date.now()}\`;
        await db.set(statusChangeKey, {
          userId: userId,
          channel: channel,
          newStatus: signal.status,
          timestamp: Date.now(),
          previousStatus: signal.previousStatus
        }, 10080); // 7 day TTL for presence analytics
        
        // Update user activity summary
        const activityKey = \`user_activity:\${userId}:\${today}\`;
        const activity = await db.get(activityKey) || {
          statusChanges: 0,
          firstSeen: Date.now(),
          lastActivity: Date.now(),
          channels: new Set()
        };
        
        activity.statusChanges += 1;
        activity.lastActivity = Date.now();
        activity.channels.add(channel);
        
        await db.set(activityKey, {
          ...activity,
          channels: Array.from(activity.channels)
        }, 1440); // 24 hour TTL
        
        // Fire real-time presence analytics event
        await pubnub.fire({
          channel: 'presence_analytics',
          message: {
            type: 'status_change',
            userId: userId,
            channel: channel,
            status: signal.status,
            timestamp: Date.now()
          }
        });
        break;
        
      case 'live_reaction':
        // Track reaction usage and engagement
        const reactionAnalytics = {
          userId: userId,
          channel: channel,
          reaction: signal.reaction,
          timestamp: Date.now(),
          context: signal.context || 'general'
        };
        
        // Store for reaction analytics dashboard
        await db.set(\`reaction:\${Date.now()}:\${userId}\`, reactionAnalytics, 10080); // 7 days
        
        // Update reaction leaderboard
        const leaderboardKey = \`reaction_leaderboard:\${today}\`;
        const leaderboard = await db.get(leaderboardKey) || {};
        
        if (!leaderboard[signal.reaction]) {
          leaderboard[signal.reaction] = 0;
        }
        leaderboard[signal.reaction] += 1;
        
        await db.set(leaderboardKey, leaderboard, 1440); // 24 hour TTL
        
        // Publish reaction trends for real-time dashboard
        if (leaderboard[signal.reaction] % 10 === 0) { // Every 10th reaction
          await pubnub.publish({
            channel: 'reaction_trends',
            message: {
              type: 'reaction_milestone',
              reaction: signal.reaction,
              count: leaderboard[signal.reaction],
              date: today,
              timestamp: Date.now()
            }
          });
        }
        break;
        
      default:
        console.log(\`Processing unknown signal type: \${signal.type}\`);
        // Store unknown signal types for analysis
        await db.incrCounter(\`unknown_signal_types:\${signal.type}\`);
    }
    
    // Calculate signal processing latency if timestamp available
    if (signal.clientTimestamp) {
      const latency = Date.now() - signal.clientTimestamp;
      await db.incrCounter('signal_latency_total', latency);
      await db.incrCounter('signal_latency_count');
      
      // Alert if latency is high (>500ms)
      if (latency > 500) {
        await pubnub.fire({
          channel: 'performance_alerts',
          message: {
            type: 'high_signal_latency',
            latency: latency,
            signalType: signal.type,
            userId: userId,
            channel: channel,
            timestamp: Date.now()
          }
        });
      }
    }
    
    // Periodic analytics summary (every 100th signal)
    const signalCount = await db.getCounter('total_signals_delivered');
    if (signalCount % 100 === 0) {
      const averageLatency = await db.getCounter('signal_latency_total') / 
                             await db.getCounter('signal_latency_count');
      
      console.log(\`Signal Analytics Summary: \${signalCount} total signals, \${averageLatency.toFixed(2)}ms avg latency\`);
      
      await pubnub.fire({
        channel: 'signal_analytics_summary',
        message: {
          totalSignals: signalCount,
          averageLatency: Math.round(averageLatency),
          timestamp: Date.now()
        }
      });
    }
    
    return request.ok();
    
  } catch (error) {
    console.error('Error in signal post-processing:', error);
    
    // For after-signal functions, we typically continue processing
    // even if analytics fail, since the signal was already delivered
    return request.ok();
  }
};`
  }
};

export default function FunctionsPage() {
  // Configuration state management
  const { setPageSettings } = useConfig();
  
  // Page settings state
  const [localPageSettings] = useState({
    selectedFunction: 'message-enricher',
  });

  // Module documentation dialog state
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);

  // Function type documentation dialog state
  const [selectedFunctionType, setSelectedFunctionType] = useState<string | null>(null);
  const [isFunctionTypeDialogOpen, setIsFunctionTypeDialogOpen] = useState(false);

  const openModuleDoc = (moduleName: string) => {
    setSelectedModule(moduleName);
    setIsModuleDialogOpen(true);
  };

  const closeModuleDialog = () => {
    setIsModuleDialogOpen(false);
    setSelectedModule(null);
  };

  const openFunctionTypeDoc = (functionType: string) => {
    setSelectedFunctionType(functionType);
    setIsFunctionTypeDialogOpen(true);
  };

  const closeFunctionTypeDialog = () => {
    setIsFunctionTypeDialogOpen(false);
    setSelectedFunctionType(null);
  };

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if available
      console.log(`${label} copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Auto-sync with config context for page settings management
  useEffect(() => {
    setPageSettings(localPageSettings);
    console.log('🔧 Functions Page Settings Updated:', localPageSettings);
  }, [localPageSettings, setPageSettings]);

  // Load saved settings on component mount
  useEffect(() => {
    console.log('📁 Functions page loaded');
  }, []);

  return (
    <div className="p-6 h-full">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}

        {/* Function Info Panel */}
        <div className="w-full">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-pubnub-text rounded-lg flex items-center justify-center">
                  <Settings className="text-white h-5 w-5" />
                </div>
                <div>
                  <CardTitle>PubNub Functions Information</CardTitle>
                  <p className="text-sm text-gray-600">Available modules and execution environment details</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-3">Available Modules</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      'kvstore', 'xhr', 'vault', 'pubnub', 
                      'crypto', 'utils', 'uuid', 'jwt',
                      'codec/*', 'advanced_math', 'jsonpath'
                    ].map(module => (
                      <button
                        key={module}
                        onClick={() => openModuleDoc(module)}
                        className="flex items-center space-x-2 p-2 bg-gray-50 rounded hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all duration-200 cursor-pointer group text-left"
                      >
                        <Database className="w-3 h-3 text-gray-500 group-hover:text-blue-600" />
                        <span className="font-mono group-hover:text-blue-700">{module}</span>
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Click any module to view documentation and examples
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-3">Function Types</h4>
                  <div className="space-y-2 text-sm">
                    {[
                      { key: 'before-publish', icon: ArrowRight, name: 'Before Publish', desc: 'Transform or validate messages before publishing' },
                      { key: 'after-publish', icon: ArrowRight, name: 'After Publish', desc: 'Process messages after they have been published' },
                      { key: 'after-presence', icon: Monitor, name: 'After Presence', desc: 'React to presence events (join, leave, timeout)' },
                      { key: 'on-request', icon: Globe, name: 'On Request', desc: 'Create RESTful endpoints with custom logic' },
                      { key: 'on-interval', icon: Clock, name: 'On Interval', desc: 'Execute code on a scheduled time interval' },
                      { key: 'before-signal', icon: Zap, name: 'Before Signal', desc: 'Transform or validate signals before they are sent' },
                      { key: 'after-signal', icon: Zap, name: 'After Signal', desc: 'Process signals after they have been delivered' }
                    ].map(({ key, icon: Icon, name, desc }) => (
                      <button
                        key={key}
                        onClick={() => openFunctionTypeDoc(key)}
                        className="flex items-center space-x-3 p-3 bg-gray-50 rounded hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all duration-200 cursor-pointer group text-left w-full"
                      >
                        <Icon className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium group-hover:text-blue-700">{name}</div>
                          <div className="text-xs text-gray-600 group-hover:text-blue-600">{desc}</div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Click any function type to view documentation and examples
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-3">Execution Limits</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-3 h-3" />
                      <span>Max 3 external operations per execution</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="w-3 h-3" />
                      <span>Max 3-level function chaining</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="w-3 h-3" />
                      <span>Async/await supported</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Activity className="w-3 h-3" />
                      <span>ES6+ JavaScript features</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Module Documentation Dialog */}
        <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {selectedModule && MODULE_DOCS[selectedModule] && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Book className="text-white h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-mono text-lg">{selectedModule}</span>
                      <span className="text-lg font-normal ml-2">- {MODULE_DOCS[selectedModule].name}</span>
                    </div>
                  </DialogTitle>
                  <DialogDescription>
                    {MODULE_DOCS[selectedModule].description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Overview */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Overview</h3>
                    <p className="text-sm text-gray-600">
                      {MODULE_DOCS[selectedModule].overview}
                    </p>
                  </div>

                  {/* Methods */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Available Methods</h3>
                    <div className="space-y-2">
                      {MODULE_DOCS[selectedModule].methods.map((method, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-mono text-sm font-medium text-blue-700 mb-1">
                            {method.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {method.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example Code */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Example Usage</h3>
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
                        <span className="text-xs text-gray-400">
                          {selectedModule}.js
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(MODULE_DOCS[selectedModule].example, `${selectedModule} example`)}
                          className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          <span className="text-xs">Copy</span>
                        </Button>
                      </div>
                      <div className="p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                          <code>{MODULE_DOCS[selectedModule].example}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      💡 All methods are asynchronous - use <code className="bg-gray-100 px-1 rounded">await</code> and <code className="bg-gray-100 px-1 rounded">try/catch</code>
                    </div>
                    <Button onClick={closeModuleDialog} variant="outline" size="sm">
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Function Type Documentation Dialog */}
        <Dialog open={isFunctionTypeDialogOpen} onOpenChange={setIsFunctionTypeDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            {selectedFunctionType && FUNCTION_TYPE_DOCS[selectedFunctionType] && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <Code className="text-white h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-lg">{FUNCTION_TYPE_DOCS[selectedFunctionType].name}</span>
                      <span className="text-lg font-normal ml-2">Function</span>
                    </div>
                  </DialogTitle>
                  <DialogDescription>
                    {FUNCTION_TYPE_DOCS[selectedFunctionType].description}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Overview */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Overview</h3>
                    <p className="text-sm text-gray-600">
                      {FUNCTION_TYPE_DOCS[selectedFunctionType].overview}
                    </p>
                  </div>

                  {/* Use Cases */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Common Use Cases</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {FUNCTION_TYPE_DOCS[selectedFunctionType].useCases.map((useCase, index) => (
                        <div key={index} className="flex items-start space-x-2 p-2 bg-green-50 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-sm text-green-800">{useCase}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Parameters */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Function Parameters</h3>
                    <div className="space-y-2">
                      {FUNCTION_TYPE_DOCS[selectedFunctionType].parameters.map((param, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-mono text-sm font-medium text-blue-700 mb-1">
                            {param.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {param.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example Code */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3">Complete Example</h3>
                    <div className="bg-gray-900 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-gray-400">
                            {selectedFunctionType}.js
                          </span>
                          <span className="text-xs text-green-400">
                            ✓ Production Ready
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(FUNCTION_TYPE_DOCS[selectedFunctionType].example, `${selectedFunctionType} function`)}
                          className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          <span className="text-xs">Copy</span>
                        </Button>
                      </div>
                      <div className="p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-100 whitespace-pre-wrap">
                          <code>{FUNCTION_TYPE_DOCS[selectedFunctionType].example}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      🚀 Copy this code and customize it for your use case
                    </div>
                    <Button onClick={closeFunctionTypeDialog} variant="outline" size="sm">
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}