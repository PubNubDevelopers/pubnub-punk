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
    example: `export default async (request) => {
  const db = require('kvstore');
  const crypto = require('crypto');
  
  try {
    const message = request.message;
    const channel = request.channels[0];
    
    // Content moderation - block messages with profanity
    const profanityWords = ['spam', 'blocked'];
    const messageText = message.text?.toLowerCase() || '';
    
    if (profanityWords.some(word => messageText.includes(word))) {
      console.log('Message blocked due to inappropriate content');
      return request.abort();
    }
    
    // Rate limiting - max 10 messages per minute per user
    const userId = message.userId;
    const rateLimitKey = \`rate_limit:\${userId}:\${Math.floor(Date.now() / 60000)}\`;
    const messageCount = await db.getCounter(rateLimitKey);
    
    if (messageCount >= 10) {
      console.log(\`Rate limit exceeded for user \${userId}\`);
      return request.abort();
    }
    
    await db.incrCounter(rateLimitKey);
    
    // Message enrichment
    message.processedAt = new Date().toISOString();
    message.messageId = crypto.sha256(JSON.stringify(message)).substring(0, 8);
    message.channel = channel;
    
    // Increment total message counter
    await db.incrCounter('total_messages_processed');
    
    console.log(\`Message processed for channel: \${channel}\`);
    return request.ok();
    
  } catch (error) {
    console.error('Error processing message:', error);
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
    example: `export default async (request) => {
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
    example: `export default async (request) => {
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
    example: `export default async (request, response) => {
  const db = require('kvstore');
  const xhr = require('xhr');
  const vault = require('vault');
  const pubnub = require('pubnub');
  
  try {
    const method = request.method || 'GET';
    const path = request.params.path;
    
    // Authentication check
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.send({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.replace('Bearer ', '');
    const validToken = await vault.get('api_access_token');
    
    if (token !== validToken) {
      return response.send({ error: 'Invalid token' }, 403);
    }
    
    // Route handling
    switch (method) {
      case 'GET':
        if (path === 'stats') {
          // Return system statistics
          const stats = {
            totalMessages: await db.getCounter('total_messages_processed') || 0,
            activeUsers: await db.getCounter('total_active_users') || 0,
            uptime: await db.get('system_start_time'),
            timestamp: Date.now()
          };
          
          return response.send(stats, 200);
          
        } else if (path === 'health') {
          // Health check endpoint
          return response.send({ 
            status: 'healthy', 
            timestamp: Date.now(),
            version: '1.0.0'
          }, 200);
          
        } else {
          return response.send({ error: 'Endpoint not found' }, 404);
        }
        
      case 'POST':
        if (path === 'webhook') {
          // Process incoming webhook
          const webhookData = JSON.parse(request.body);
          
          // Validate webhook signature (example)
          const signature = request.headers['x-webhook-signature'];
          // ... signature validation logic ...
          
          // Process the webhook data
          await db.set(\`webhook:\${Date.now()}\`, {
            data: webhookData,
            timestamp: Date.now(),
            source: request.headers['user-agent']
          }, 1440); // Store for 24 hours
          
          // Forward to internal channel
          await pubnub.publish({
            channel: 'webhook_events',
            message: {
              type: 'external_webhook',
              data: webhookData,
              timestamp: Date.now()
            }
          });
          
          return response.send({ status: 'processed' }, 200);
          
        } else if (path === 'notify') {
          // Send notification
          const { channel, message, priority } = JSON.parse(request.body);
          
          if (!channel || !message) {
            return response.send({ 
              error: 'Missing required fields: channel, message' 
            }, 400);
          }
          
          await pubnub.publish({
            channel: channel,
            message: {
              text: message,
              priority: priority || 'normal',
              timestamp: Date.now(),
              source: 'api'
            }
          });
          
          return response.send({ 
            status: 'sent', 
            channel: channel 
          }, 200);
          
        } else {
          return response.send({ error: 'Endpoint not found' }, 404);
        }
        
      default:
        return response.send({ 
          error: \`Method \${method} not allowed\` 
        }, 405);
    }
    
  } catch (error) {
    console.error('API endpoint error:', error);
    return response.send({ 
      error: 'Internal server error' 
    }, 500);
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
                      { key: 'on-request', icon: Globe, name: 'On Request', desc: 'Create RESTful endpoints with custom logic' }
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