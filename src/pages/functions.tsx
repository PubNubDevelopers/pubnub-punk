import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Code, 
  Play, 
  Square, 
  Send, 
  Clock, 
  Globe, 
  Settings, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Zap,
  Database,
  Key,
  ArrowRight,
  Monitor,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'functions.selectedFunction': { section: 'functions', field: 'selectedFunction', type: 'string', default: 'message-enricher' },
  'functions.functionType': { section: 'functions', field: 'functionType', type: 'string', default: 'before-publish' },
  'functions.channel': { section: 'functions', field: 'channel', type: 'string', default: 'test-channel' },
  'functions.channelPattern': { section: 'functions', field: 'channelPattern', type: 'string', default: '' },
  'functions.code': { section: 'functions', field: 'code', type: 'string', default: '' },
  'functions.testMessage': { section: 'functions', field: 'testMessage', type: 'string', default: '{"text": "Hello, World!", "type": "greeting"}' },
  'functions.testParams': { section: 'functions', field: 'testParams', type: 'string', default: '{}' },
  'functions.testQuery': { section: 'functions', field: 'testQuery', type: 'string', default: '{}' },
  'functions.testBody': { section: 'functions', field: 'testBody', type: 'string', default: '{}' },
  'functions.intervalSeconds': { section: 'functions', field: 'intervalSeconds', type: 'number', default: 30 },
  'functions.showAdvanced': { section: 'functions', field: 'showAdvanced', type: 'boolean', default: false },
  'functions.autoFormat': { section: 'functions', field: 'autoFormat', type: 'boolean', default: true },
} as const;

// Function templates for each type
const FUNCTION_TEMPLATES = {
  'before-publish': {
    name: 'Before Publish',
    description: 'Transform or validate messages before they are published',
    code: `export default async (request) => {
  const db = require('kvstore');
  const xhr = require('xhr');
  
  try {
    const message = request.message;
    const channel = request.channels[0];
    
    console.log('Processing message for channel:', channel);
    
    // Add timestamp to message
    message.processedAt = new Date().toISOString();
    
    // Increment message counter
    const messageCount = await db.incrCounter('total_messages');
    message.sequenceNumber = messageCount;
    
    console.log('Message processed successfully:', message);
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
    code: `export default async (request) => {
  const db = require('kvstore');
  const pubnub = require('pubnub');
  
  try {
    const message = request.message;
    const channel = request.channels[0];
    
    console.log('Message published to channel:', channel);
    
    // Store message for analytics
    await db.set(\`message:\${Date.now()}\`, {
      channel: channel,
      message: message,
      timestamp: new Date().toISOString()
    }, 1440); // 24 hour TTL
    
    // Send analytics event
    await pubnub.fire({
      channel: 'analytics',
      message: {
        type: 'message_published',
        channel: channel,
        timestamp: Date.now()
      }
    });
    
    return request.ok();
    
  } catch (error) {
    console.error('Error in after-publish function:', error);
    return request.ok(); // Don't block the message
  }
};`
  },
  'on-request': {
    name: 'On Request (HTTP)',
    description: 'Handle HTTP requests to your function endpoint',
    code: `export default async (request, response) => {
  const db = require('kvstore');
  const vault = require('vault');
  
  try {
    // Set CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*';
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE';
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    
    if (request.method === 'OPTIONS') {
      return response.send('', 200);
    }
    
    const userId = request.params.userId;
    
    switch (request.method) {
      case 'GET':
        const userData = await db.get(\`user:\${userId}\`);
        if (!userData) {
          return response.send({ error: 'User not found' }, 404);
        }
        return response.send(userData, 200);
        
      case 'POST':
        const body = await request.json();
        const user = {
          id: userId,
          name: body.name,
          email: body.email,
          createdAt: new Date().toISOString()
        };
        
        await db.set(\`user:\${userId}\`, user, 43200); // 30 days
        return response.send({ message: 'User created', user }, 201);
        
      default:
        return response.send({ error: 'Method not allowed' }, 405);
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    return response.send({ error: 'Internal server error' }, 500);
  }
};`
  },
  'on-interval': {
    name: 'On Interval (Scheduled)',
    description: 'Execute code on a scheduled interval',
    code: `export default async (event) => {
  const db = require('kvstore');
  const pubnub = require('pubnub');
  const xhr = require('xhr');
  
  try {
    console.log('Scheduled function triggered at:', new Date().toISOString());
    
    // Perform cleanup of expired data
    const allKeys = await db.getKeys();
    const tempKeys = allKeys.filter(key => key.startsWith('temp:'));
    
    let cleaned = 0;
    for (const key of tempKeys) {
      const data = await db.get(key);
      if (data && data.expiresAt && new Date(data.expiresAt) < new Date()) {
        await db.removeItem(key);
        cleaned++;
      }
    }
    
    // Send status update
    await pubnub.publish({
      channel: 'system_status',
      message: {
        type: 'cleanup_complete',
        itemsCleaned: cleaned,
        timestamp: Date.now()
      }
    });
    
    console.log(\`Cleanup complete. Removed \${cleaned} expired items.\`);
    return event.ok();
    
  } catch (error) {
    console.error('Error in scheduled function:', error);
    return event.abort();
  }
};`
  }
};

// Mock execution results for testing
const MOCK_EXECUTION_RESULTS = {
  success: {
    status: 'completed',
    duration: 245,
    result: 'ok',
    logs: [
      { level: 'info', message: 'Processing message for channel: test-channel', timestamp: Date.now() - 200 },
      { level: 'info', message: 'Message processed successfully: {"text":"Hello, World!","type":"greeting","processedAt":"2023-12-07T10:30:00.000Z","sequenceNumber":42}', timestamp: Date.now() - 100 },
    ],
    output: {
      message: {
        text: "Hello, World!",
        type: "greeting",
        processedAt: "2023-12-07T10:30:00.000Z",
        sequenceNumber: 42
      },
      modified: true
    }
  },
  error: {
    status: 'error',
    duration: 89,
    result: 'abort',
    logs: [
      { level: 'info', message: 'Processing message for channel: test-channel', timestamp: Date.now() - 200 },
      { level: 'error', message: 'Error processing message: Invalid message format', timestamp: Date.now() - 100 },
    ],
    error: 'Invalid message format',
    output: null
  }
};

declare global {
  interface Window {
    PubNub: any;
  }
}

export default function FunctionsPage() {
  const { toast } = useToast();
  const { pageSettings, setPageSettings, setConfigType } = useConfig();
  const [mounted, setMounted] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(true);
  const [showResult, setShowResult] = useState(true);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set config type and initialize
  useEffect(() => {
    setConfigType('FUNCTIONS');
    
    // Initialize page settings
    if (!pageSettings?.functions) {
      const defaultSettings = {
        functions: {
          selectedFunction: FIELD_DEFINITIONS['functions.selectedFunction'].default,
          functionType: FIELD_DEFINITIONS['functions.functionType'].default,
          channel: FIELD_DEFINITIONS['functions.channel'].default,
          channelPattern: FIELD_DEFINITIONS['functions.channelPattern'].default,
          code: FUNCTION_TEMPLATES['before-publish'].code,
          testMessage: FIELD_DEFINITIONS['functions.testMessage'].default,
          testParams: FIELD_DEFINITIONS['functions.testParams'].default,
          testQuery: FIELD_DEFINITIONS['functions.testQuery'].default,
          testBody: FIELD_DEFINITIONS['functions.testBody'].default,
          intervalSeconds: FIELD_DEFINITIONS['functions.intervalSeconds'].default,
          showAdvanced: FIELD_DEFINITIONS['functions.showAdvanced'].default,
          autoFormat: FIELD_DEFINITIONS['functions.autoFormat'].default,
        }
      };
      setPageSettings(defaultSettings);
    }
  }, [setConfigType, setPageSettings, pageSettings]);

  // Computed values from pageSettings
  const selectedFunction = pageSettings?.functions?.selectedFunction || FIELD_DEFINITIONS['functions.selectedFunction'].default;
  const functionType = pageSettings?.functions?.functionType || FIELD_DEFINITIONS['functions.functionType'].default;
  const channel = pageSettings?.functions?.channel || FIELD_DEFINITIONS['functions.channel'].default;
  const channelPattern = pageSettings?.functions?.channelPattern || FIELD_DEFINITIONS['functions.channelPattern'].default;
  const code = pageSettings?.functions?.code || FUNCTION_TEMPLATES['before-publish'].code;
  const testMessage = pageSettings?.functions?.testMessage || FIELD_DEFINITIONS['functions.testMessage'].default;
  const testParams = pageSettings?.functions?.testParams || FIELD_DEFINITIONS['functions.testParams'].default;
  const testQuery = pageSettings?.functions?.testQuery || FIELD_DEFINITIONS['functions.testQuery'].default;
  const testBody = pageSettings?.functions?.testBody || FIELD_DEFINITIONS['functions.testBody'].default;
  const intervalSeconds = pageSettings?.functions?.intervalSeconds || FIELD_DEFINITIONS['functions.intervalSeconds'].default;
  const showAdvanced = pageSettings?.functions?.showAdvanced || FIELD_DEFINITIONS['functions.showAdvanced'].default;
  const autoFormat = pageSettings?.functions?.autoFormat || FIELD_DEFINITIONS['functions.autoFormat'].default;

  // Update field helper
  const updateField = (path: string, value: any) => {
    const def = FIELD_DEFINITIONS[path as keyof typeof FIELD_DEFINITIONS];
    if (def) {
      setPageSettings(prev => ({
        ...prev,
        [def.section]: {
          ...prev?.[def.section],
          [def.field]: value
        }
      }));
    }
  };

  // Load function template
  const loadTemplate = (type: string) => {
    const template = FUNCTION_TEMPLATES[type as keyof typeof FUNCTION_TEMPLATES];
    if (template) {
      updateField('functions.code', template.code);
      updateField('functions.functionType', type);
      toast({
        title: "Template loaded",
        description: `Loaded ${template.name} template`,
      });
    }
  };

  // Format code
  const formatCode = () => {
    try {
      // Simple formatting for JavaScript - replace with proper formatter if needed
      const formatted = code
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/;\s*}/g, ';\n}')
        .replace(/{\s*/g, '{\n  ')
        .replace(/}\s*catch/g, '}\ncatch')
        .replace(/}\s*finally/g, '}\nfinally');
      
      updateField('functions.code', formatted);
      toast({
        title: "Code formatted",
        description: "Code has been formatted",
      });
    } catch (error) {
      toast({
        title: "Format failed",
        description: "Failed to format code",
        variant: "destructive",
      });
    }
  };

  // Test function execution
  const testFunction = async () => {
    setExecuting(true);
    setExecutionResult(null);

    try {
      // Simulate function execution with mock results
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      // Randomly choose success or error for demo
      const isSuccess = Math.random() > 0.3;
      const result = isSuccess ? MOCK_EXECUTION_RESULTS.success : MOCK_EXECUTION_RESULTS.error;
      
      setExecutionResult({
        ...result,
        timestamp: new Date().toISOString(),
        functionType,
        channel: functionType === 'on-request' ? 'HTTP endpoint' : channel,
      });

      toast({
        title: isSuccess ? "Function executed successfully" : "Function execution failed",
        description: isSuccess 
          ? `Function completed in ${result.duration}ms`
          : `Function failed: ${result.error}`,
        variant: isSuccess ? "default" : "destructive",
      });

    } catch (error) {
      console.error('Test execution failed:', error);
      toast({
        title: "Test failed",
        description: "Failed to execute function test",
        variant: "destructive",
      });
    } finally {
      setExecuting(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${description} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Format JSON
  const formatJson = (field: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      updateField(field, formatted);
    } catch (error) {
      // Invalid JSON, leave as is
    }
  };

  if (!mounted) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-16 h-16 text-pubnub-blue mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading Functions Tool</h3>
            <p className="text-gray-600">Starting up...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-pubnub-text mb-2">PubNub Functions Developer Tool</h1>
          <p className="text-gray-600">Test and debug serverless JavaScript functions for real-time applications</p>
        </div>

        {/* Main Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - Function Code */}
          <div className="flex-1 flex flex-col min-w-0">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-pubnub-blue rounded-lg flex items-center justify-center">
                      <Code className="text-white h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Function Code</CardTitle>
                      <p className="text-sm text-gray-600">Write and edit your PubNub Function</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={formatCode}
                      disabled={!code.trim()}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Format
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(code, 'Function code')}
                      disabled={!code.trim()}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Function Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Function Type</Label>
                    <Select value={functionType} onValueChange={(value) => updateField('functions.functionType', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before-publish">Before Publish</SelectItem>
                        <SelectItem value="after-publish">After Publish</SelectItem>
                        <SelectItem value="on-request">On Request (HTTP)</SelectItem>
                        <SelectItem value="on-interval">On Interval (Scheduled)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Load Template</Label>
                    <Select onValueChange={loadTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FUNCTION_TEMPLATES).map(([key, template]) => (
                          <SelectItem key={key} value={key}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Trigger Configuration */}
                {functionType !== 'on-interval' && (
                  <div className="space-y-2">
                    <Label>
                      {functionType === 'on-request' ? 'HTTP Endpoint Path' : 'Channel Pattern'}
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder={
                          functionType === 'on-request' 
                            ? '/api/users/{userId}' 
                            : 'channel-name or pattern.*'
                        }
                        value={functionType === 'on-request' ? channelPattern : channel}
                        onChange={(e) => updateField(
                          functionType === 'on-request' ? 'functions.channelPattern' : 'functions.channel', 
                          e.target.value
                        )}
                      />
                      {functionType !== 'on-request' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(channel, 'Channel name')}
                          disabled={!channel.trim()}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {functionType === 'on-request' 
                        ? 'URL path pattern for HTTP endpoint (use {param} for path parameters)'
                        : 'Channel name or wildcard pattern (e.g., alerts.* matches alerts.critical, alerts.info)'
                      }
                    </p>
                  </div>
                )}

                {/* Interval Configuration */}
                {functionType === 'on-interval' && (
                  <div className="space-y-2">
                    <Label>Interval (seconds)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="3600"
                      value={intervalSeconds}
                      onChange={(e) => updateField('functions.intervalSeconds', parseInt(e.target.value) || 30)}
                    />
                    <p className="text-xs text-gray-500">
                      How often the function should execute (1 second to 1 hour)
                    </p>
                  </div>
                )}

                {/* Code Editor */}
                <div className="flex-1 flex flex-col space-y-2">
                  <Label>Function Code</Label>
                  <Textarea
                    ref={codeTextareaRef}
                    value={code}
                    onChange={(e) => updateField('functions.code', e.target.value)}
                    className="flex-1 font-mono text-sm resize-none"
                    placeholder="export default async (request) => {
  // Your function code here
  return request.ok();
};"
                    style={{ minHeight: '300px' }}
                  />
                  <p className="text-xs text-gray-500">
                    Write your function using ES6+ JavaScript. Available modules: kvstore, xhr, vault, pubnub, crypto, utils, uuid, jwt, codec/*, advanced_math, jsonpath
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Test & Results */}
          <div className="w-96 flex flex-col space-y-6">
            {/* Test Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <Play className="text-white h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle>Test Function</CardTitle>
                      <p className="text-sm text-gray-600">Configure test parameters</p>
                    </div>
                  </div>
                  <Button
                    onClick={testFunction}
                    disabled={executing || !code.trim()}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {executing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Test Function
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="message" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="message" disabled={functionType === 'on-request'}>
                      Message
                    </TabsTrigger>
                    <TabsTrigger value="http" disabled={functionType !== 'on-request'}>
                      HTTP
                    </TabsTrigger>
                    <TabsTrigger value="context">
                      Context
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Message Test Data */}
                  <TabsContent value="message" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Test Message</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => formatJson('functions.testMessage', testMessage)}
                        >
                          Format JSON
                        </Button>
                      </div>
                      <Textarea
                        value={testMessage}
                        onChange={(e) => updateField('functions.testMessage', e.target.value)}
                        placeholder='{"text": "Hello, World!", "type": "greeting"}'
                        className="font-mono text-sm"
                        rows={4}
                      />
                      <p className="text-xs text-gray-500">
                        The message payload that will be passed to your function
                      </p>
                    </div>
                  </TabsContent>

                  {/* HTTP Test Data */}
                  <TabsContent value="http" className="space-y-4">
                    <div className="space-y-2">
                      <Label>URL Parameters</Label>
                      <Textarea
                        value={testParams}
                        onChange={(e) => updateField('functions.testParams', e.target.value)}
                        placeholder='{"userId": "123", "action": "update"}'
                        className="font-mono text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Query String</Label>
                      <Textarea
                        value={testQuery}
                        onChange={(e) => updateField('functions.testQuery', e.target.value)}
                        placeholder='{"limit": "10", "offset": "0"}'
                        className="font-mono text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Request Body</Label>
                      <Textarea
                        value={testBody}
                        onChange={(e) => updateField('functions.testBody', e.target.value)}
                        placeholder='{"name": "John Doe", "email": "john@example.com"}'
                        className="font-mono text-sm"
                        rows={3}
                      />
                    </div>
                  </TabsContent>

                  {/* Context/Environment */}
                  <TabsContent value="context" className="space-y-4">
                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>Function Type:</span>
                        <span className="font-mono">{functionType}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>Channel:</span>
                        <span className="font-mono">{functionType === 'on-request' ? 'HTTP' : channel}</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>User ID:</span>
                        <span className="font-mono">test-user-123</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>Timestamp:</span>
                        <span className="font-mono">{Date.now()}</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Execution Results */}
            {executionResult && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        executionResult.status === 'completed' 
                          ? 'bg-green-500' 
                          : 'bg-red-500'
                      }`}>
                        {executionResult.status === 'completed' ? (
                          <CheckCircle2 className="text-white h-5 w-5" />
                        ) : (
                          <XCircle className="text-white h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <CardTitle>Execution Result</CardTitle>
                        <p className="text-sm text-gray-600">
                          {executionResult.status === 'completed' ? 'Success' : 'Failed'} • {executionResult.duration}ms
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(executionResult, null, 2), 'Execution result')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status and Timing */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <div className={`font-medium ${
                        executionResult.status === 'completed' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {executionResult.result}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <div className="font-medium">{executionResult.duration}ms</div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {executionResult.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center space-x-2 text-red-700 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Error</span>
                      </div>
                      <p className="text-sm text-red-600">{executionResult.error}</p>
                    </div>
                  )}

                  {/* Logs */}
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowLogs(!showLogs)}
                      className="p-0 h-auto font-medium text-gray-700 hover:text-gray-900"
                    >
                      <Monitor className="w-4 h-4 mr-2" />
                      Execution Logs ({executionResult.logs?.length || 0})
                      {showLogs ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                    </Button>
                    {showLogs && (
                      <div className="mt-2 max-h-32 overflow-y-auto bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono">
                        {executionResult.logs?.map((log: any, index: number) => (
                          <div key={index} className="mb-1">
                            <span className={`${
                              log.level === 'error' ? 'text-red-400' : 
                              log.level === 'warn' ? 'text-yellow-400' : 
                              'text-gray-400'
                            }`}>
                              [{log.level.toUpperCase()}]
                            </span>
                            <span className="ml-2">{log.message}</span>
                          </div>
                        )) || <div className="text-gray-500">No logs</div>}
                      </div>
                    )}
                  </div>

                  {/* Output */}
                  {executionResult.output && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowResult(!showResult)}
                        className="p-0 h-auto font-medium text-gray-700 hover:text-gray-900"
                      >
                        <Activity className="w-4 h-4 mr-2" />
                        Function Output
                        {showResult ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                      </Button>
                      {showResult && (
                        <div className="mt-2">
                          <pre className="bg-gray-50 p-3 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(executionResult.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Function Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pubnub-text rounded-lg flex items-center justify-center">
                    <Settings className="text-white h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Function Info</CardTitle>
                    <p className="text-sm text-gray-600">Available modules and limits</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Available Modules</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        'kvstore', 'xhr', 'vault', 'pubnub', 
                        'crypto', 'utils', 'uuid', 'jwt',
                        'codec/*', 'advanced_math', 'jsonpath'
                      ].map(module => (
                        <div key={module} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <Database className="w-3 h-3 text-gray-500" />
                          <span className="font-mono">{module}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Execution Limits</h4>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>• Max 3 external operations per execution</div>
                      <div>• Max 3-level function chaining</div>
                      <div>• Async/await supported</div>
                      <div>• ES6+ JavaScript features</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}