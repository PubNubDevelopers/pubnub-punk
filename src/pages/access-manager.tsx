import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Copy,
  Key,
  Clock,
  User,
  Lock,
  Unlock,
  FileText,
  Settings,
  CheckCircle2,
  AlertCircle,
  Hash,
  Users,
  Layers,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { storage } from '@/lib/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

// REST API Helper Functions for Access Manager
async function generateSignature(
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
  
  console.log('String to sign:', stringToSign);
  
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
function convertPermissionsToBitmask(permissions: any): any {
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
async function generateGrantTokenCurl(
  subscribeKey: string,
  publishKey: string,
  secretKey: string,
  grantRequest: any
): Promise<string> {
  // Generate current Unix timestamp - PubNub requires this to be within ±60 seconds of NTP time
  const timestamp = Math.floor(Date.now() / 1000);
  const uri = `/v3/pam/${subscribeKey}/grant`;
  
  const queryParams = {
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
async function generateRevokeTokenCurl(
  subscribeKey: string,
  publishKey: string,
  secretKey: string,
  token: string
): Promise<string> {
  // Generate current Unix timestamp - PubNub requires this to be within ±60 seconds of NTP time
  const timestamp = Math.floor(Date.now() / 1000);
  const uri = `/v3/pam/${subscribeKey}/revoke`;
  
  const queryParams = {
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

interface TokenData {
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

interface ChannelPermissions {
  read?: boolean;
  write?: boolean;
  get?: boolean;
  manage?: boolean;
  update?: boolean;
  join?: boolean;
  delete?: boolean;
}

interface ChannelGroupPermissions {
  read?: boolean;
  manage?: boolean;
}

interface UuidPermissions {
  get?: boolean;
  update?: boolean;
  delete?: boolean;
}

interface ParsedToken {
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

// Field definitions for config management
const FIELD_DEFINITIONS = {
  'accessManager.tokens': { section: 'accessManager', field: 'tokens', type: 'array', default: [] },
  'accessManager.selectedToken': { section: 'accessManager', field: 'selectedToken', type: 'string', default: '' },
  'accessManager.grantForm': { section: 'accessManager', field: 'grantForm', type: 'object', default: {} },
  'accessManager.searchTerm': { section: 'accessManager', field: 'searchTerm', type: 'string', default: '' },
} as const;

// Declare PubNub as a global variable from the CDN
declare global {
  interface Window {
    PubNub: any;
  }
}

export default function AccessManagerPage() {
  const { toast } = useToast();
  const { setPageSettings, setConfigType } = useConfig();
  
  // State for PubNub availability and instance
  const [mounted, setMounted] = useState(false);
  const [pubnubReady, setPubnubReady] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
  // Get app settings for secret key
  const [appSettings, setAppSettings] = useState(storage.getSettings());
  const secretKey = appSettings.credentials.secretKey;
  
  // Core state
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // Dialog states
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [parseDialogOpen, setParseDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  
  // Grant token form state
  const [grantForm, setGrantForm] = useState({
    ttl: 60,
    authorizedUserId: '',
    description: '',
    channels: [] as Array<{ name: string; permissions: ChannelPermissions }>,
    channelGroups: [] as Array<{ name: string; permissions: ChannelGroupPermissions }>,
    uuids: [] as Array<{ name: string; permissions: UuidPermissions }>,
    channelPatterns: [] as Array<{ pattern: string; permissions: ChannelPermissions }>,
    channelGroupPatterns: [] as Array<{ pattern: string; permissions: ChannelGroupPermissions }>,
    uuidPatterns: [] as Array<{ pattern: string; permissions: UuidPermissions }>,
    meta: {} as Record<string, string>,
  });
  
  // Parse token state
  const [parseTokenInput, setParseTokenInput] = useState('');
  const [parsedTokenResult, setParsedTokenResult] = useState<ParsedToken | null>(null);
  
  // Revoke token state
  const [revokeTokenInput, setRevokeTokenInput] = useState('');
  
  // Test token state
  const [testTokenInput, setTestTokenInput] = useState('');
  const [testOperation, setTestOperation] = useState<'publish' | 'subscribe' | 'presence'>('publish');
  const [testChannel, setTestChannel] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Curl command state
  const [grantTokenCurl, setGrantTokenCurl] = useState('');
  const [revokeTokenCurl, setRevokeTokenCurl] = useState('');
  
  // Manual token addition state
  const [manualTokenInput, setManualTokenInput] = useState('');
  const [manualTokenDialogOpen, setManualTokenDialogOpen] = useState(false);

  // Helper function to check if PAM operations are available
  const isPamConfigurationValid = useMemo(() => {
    const currentSettings = storage.getSettings();
    return pubnubReady && 
           currentSettings.credentials.secretKey && 
           currentSettings.credentials.publishKey && 
           currentSettings.credentials.subscribeKey &&
           currentSettings.credentials.publishKey !== 'demo' && 
           currentSettings.credentials.subscribeKey !== 'demo';
  }, [pubnubReady, appSettings]); // appSettings as dependency to trigger recalculation when state updates
  
  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('ACCESS_MANAGER');
    
    // Initialize page settings
    setPageSettings({
      accessManager: {
        tokens: FIELD_DEFINITIONS['accessManager.tokens'].default,
        selectedToken: FIELD_DEFINITIONS['accessManager.selectedToken'].default,
        grantForm: FIELD_DEFINITIONS['accessManager.grantForm'].default,
        searchTerm: FIELD_DEFINITIONS['accessManager.searchTerm'].default,
      },
      configForSaving: {
        tokens: FIELD_DEFINITIONS['accessManager.tokens'].default,
        secretKeyConfigured: !!secretKey,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings]);
  
  // Check for PubNub availability on mount and create instance
  useEffect(() => {
    if (!mounted) return;
    
    let attempts = 0;
    const maxAttempts = 30;
    
    const checkPubNub = () => {
      attempts++;
      
      if (typeof window !== 'undefined' && window.PubNub) {
        setPubnubReady(true);
        try {
          const pubnubConfig: any = {
            publishKey: appSettings.credentials.publishKey || 'demo',
            subscribeKey: appSettings.credentials.subscribeKey || 'demo',
            userId: appSettings.credentials.userId || 'access-manager-user',
            secretKey: secretKey || 'demo',
          };
          
          // Add PAM token if available
          if (appSettings.credentials.pamToken) {
            pubnubConfig.authKey = appSettings.credentials.pamToken;
          }
          
          const pubnubInstance = new window.PubNub(pubnubConfig);
          setPubnub(pubnubInstance);
        } catch (error) {
          console.error('Error creating PubNub instance:', error);
        }
      } else if (attempts < maxAttempts) {
        setTimeout(checkPubNub, 100);
      }
    };
    
    checkPubNub();
  }, [mounted, secretKey, appSettings]);

  // Load app settings on mount and when they change
  useEffect(() => {
    const settings = storage.getSettings();
    setAppSettings(settings);
  }, []);

  // Function to refresh settings (called when needed)
  const refreshSettings = () => {
    const settings = storage.getSettings();
    setAppSettings(settings);
  };

  // Refresh settings when page gains focus (e.g., user returns from settings page)
  useEffect(() => {
    const handleFocus = () => {
      refreshSettings();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Load saved tokens from localStorage
  useEffect(() => {
    const savedTokens = storage.getItem('accessManager.tokens');
    if (savedTokens) {
      setTokens(savedTokens);
    }
  }, []);

  // Save tokens to localStorage
  useEffect(() => {
    storage.setItem('accessManager.tokens', tokens);
  }, [tokens]);


  // Update page settings when state changes
  useEffect(() => {
    setPageSettings({
      accessManager: {
        tokens,
        selectedToken,
        grantForm,
        searchTerm,
        secretKeyConfigured: !!secretKey,
      },
      configForSaving: {
        tokens: tokens.map(t => ({ ...t, token: '[HIDDEN]' })),
        secretKeyConfigured: !!secretKey,
        timestamp: new Date().toISOString(),
      }
    });
  }, [tokens, selectedToken, grantForm, searchTerm, secretKey, setPageSettings]);

  // Copy to clipboard helper
  const copyToClipboard = useCallback(async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${description} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Grant token function
  const grantToken = useCallback(async () => {
    // Refresh settings to ensure we have the latest configuration
    const currentSettings = storage.getSettings();
    const currentSecretKey = currentSettings.credentials.secretKey;
    
    console.log('Grant Token Debug - Current Settings:', {
      publishKey: currentSettings.credentials.publishKey,
      subscribeKey: currentSettings.credentials.subscribeKey,
      secretKey: currentSecretKey ? '[HIDDEN]' : 'NOT SET',
      pubnubReady,
    });
    
    if (!pubnub || !currentSecretKey) {
      toast({
        title: 'Configuration Required',
        description: 'Please configure your secret key and ensure PubNub is loaded',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    try {
      // Build resources object
      const resources: any = {};
      
      if (grantForm.channels.length > 0) {
        resources.channels = {};
        grantForm.channels.forEach(channel => {
          resources.channels[channel.name] = channel.permissions;
        });
      }
      
      if (grantForm.channelGroups.length > 0) {
        resources.groups = {};
        grantForm.channelGroups.forEach(group => {
          resources.groups[group.name] = group.permissions;
        });
      }
      
      if (grantForm.uuids.length > 0) {
        resources.uuids = {};
        grantForm.uuids.forEach(uuid => {
          resources.uuids[uuid.name] = uuid.permissions;
        });
      }

      // Build patterns object
      const patterns: any = {};
      
      if (grantForm.channelPatterns.length > 0) {
        patterns.channels = {};
        grantForm.channelPatterns.forEach(pattern => {
          patterns.channels[pattern.pattern] = pattern.permissions;
        });
      }
      
      if (grantForm.channelGroupPatterns.length > 0) {
        patterns.groups = {};
        grantForm.channelGroupPatterns.forEach(pattern => {
          patterns.groups[pattern.pattern] = pattern.permissions;
        });
      }
      
      if (grantForm.uuidPatterns.length > 0) {
        patterns.uuids = {};
        grantForm.uuidPatterns.forEach(pattern => {
          patterns.uuids[pattern.pattern] = pattern.permissions;
        });
      }

      // Check if we have real keys (not demo keys)
      if (!currentSettings.credentials.publishKey || !currentSettings.credentials.subscribeKey || 
          currentSettings.credentials.publishKey === 'demo' || currentSettings.credentials.subscribeKey === 'demo') {
        throw new Error('Real PubNub keys are required for Access Manager operations. Demo keys do not support PAM functionality.');
      }

      // Build the grant request for REST API
      const grantRequest: any = {
        ttl: grantForm.ttl,
      };

      if (grantForm.authorizedUserId) {
        grantRequest.authorized_uuid = grantForm.authorizedUserId;
      }

      if (Object.keys(resources).length > 0) {
        grantRequest.resources = resources;
      }

      if (Object.keys(patterns).length > 0) {
        grantRequest.patterns = patterns;
      }

      if (Object.keys(grantForm.meta).length > 0) {
        grantRequest.meta = grantForm.meta;
      }

      console.log('*** Generating curl command for grantToken ***');
      console.log('Grant request:', grantRequest);
      console.log('Subscribe Key:', currentSettings.credentials.subscribeKey);
      console.log('Secret Key present:', currentSecretKey ? '[PRESENT]' : '[MISSING]');
      
      // Generate the curl command for manual execution
      const curlCommand = await generateGrantTokenCurl(
        currentSettings.credentials.subscribeKey,
        currentSettings.credentials.publishKey,
        currentSecretKey,
        grantRequest
      );
      
      console.log('Generated curl command:', curlCommand);
      
      // Store the curl command for display in the UI
      setGrantTokenCurl(curlCommand);
      
      // Show success message with instructions
      toast({
        title: 'Curl command generated',
        description: 'Run the curl command below to create the token, then manually add it to your list',
        duration: 8000,
      });
      
    } catch (error) {
      console.error('Grant token error:', error);
      toast({
        title: 'Grant token failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  }, [pubnub, grantForm, toast]);

  // Parse token function
  const parseToken = useCallback(async () => {
    if (!pubnub || !parseTokenInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a token to parse',
        variant: 'destructive',
      });
      return;
    }

    setIsParsing(true);
    try {
      const result = pubnub.parseToken(parseTokenInput.trim());
      setParsedTokenResult(result);
      
      toast({
        title: 'Token parsed successfully',
        description: 'Token details have been extracted',
      });
      
    } catch (error) {
      console.error('Parse token error:', error);
      toast({
        title: 'Parse token failed',
        description: error instanceof Error ? error.message : 'Invalid token format',
        variant: 'destructive',
      });
      setParsedTokenResult(null);
    } finally {
      setIsParsing(false);
    }
  }, [pubnub, parseTokenInput, toast]);

  // Revoke token function
  const revokeToken = useCallback(async () => {
    // Refresh settings to ensure we have the latest configuration
    const currentSettings = storage.getSettings();
    const currentSecretKey = currentSettings.credentials.secretKey;
    
    if (!pubnub || !currentSecretKey || !revokeTokenInput.trim()) {
      toast({
        title: 'Configuration Required',
        description: 'Please configure your secret key and enter a token to revoke',
        variant: 'destructive',
      });
      return;
    }

    setIsRevoking(true);
    try {
      // Check if we have real keys (not demo keys)
      if (!currentSettings.credentials.publishKey || !currentSettings.credentials.subscribeKey || 
          currentSettings.credentials.publishKey === 'demo' || currentSettings.credentials.subscribeKey === 'demo') {
        throw new Error('Real PubNub keys are required for Access Manager operations. Demo keys do not support PAM functionality.');
      }

      console.log('*** Generating curl command for revokeToken ***');
      console.log('Subscribe Key:', currentSettings.credentials.subscribeKey);
      console.log('Token to revoke:', revokeTokenInput.trim());
      console.log('Secret Key present:', currentSecretKey ? '[PRESENT]' : '[MISSING]');
      
      // Generate curl command for manual execution
      const curlCommand = await generateRevokeTokenCurl(
        currentSettings.credentials.subscribeKey,
        currentSettings.credentials.publishKey,
        currentSecretKey,
        revokeTokenInput.trim()
      );
      
      console.log('Generated revoke curl command:', curlCommand);
      
      // Store the curl command for display in the UI
      setRevokeTokenCurl(curlCommand);
      
      // Show success message with instructions
      toast({
        title: 'Curl command generated',
        description: 'Run the curl command below to revoke the token',
        duration: 8000,
      });
      
    } catch (error) {
      console.error('Revoke token error:', error);
      toast({
        title: 'Revoke token failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(false);
    }
  }, [pubnub, revokeTokenInput, toast]);

  // Manual token addition function
  const addManualToken = useCallback(() => {
    if (!manualTokenInput.trim()) {
      toast({
        title: 'Token required',
        description: 'Please enter a token to add',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Parse the token to get basic info
      const parsedToken = window.PubNub ? window.PubNub.parseToken(manualTokenInput.trim()) : null;
      
      const tokenData: TokenData = {
        id: Date.now().toString(),
        token: manualTokenInput.trim(),
        authorizedUserId: parsedToken?.authorized_uuid || 'Unknown',
        ttl: parsedToken?.ttl || 0,
        createdAt: new Date().toISOString(),
        expiresAt: parsedToken?.ttl ? 
          new Date(Date.now() + parsedToken.ttl * 60 * 1000).toISOString() : 
          new Date().toISOString(),
        permissions: {
          channels: parsedToken?.resources?.channels || {},
          channelGroups: parsedToken?.resources?.groups || {},
          uuids: parsedToken?.resources?.uuids || {},
        },
        patterns: {
          channels: parsedToken?.patterns?.channels || {},
          channelGroups: parsedToken?.patterns?.groups || {},
          uuids: parsedToken?.patterns?.uuids || {},
        },
        meta: parsedToken?.meta || {},
        status: 'active',
        description: 'Manually added token',
      };

      setTokens(prev => [tokenData, ...prev]);
      setManualTokenDialogOpen(false);
      setManualTokenInput('');

      toast({
        title: 'Token added successfully',
        description: 'Manual token has been added to your list',
      });
      
    } catch (error) {
      // If parsing fails, add it anyway with minimal info
      const tokenData: TokenData = {
        id: Date.now().toString(),
        token: manualTokenInput.trim(),
        authorizedUserId: 'Unknown',
        ttl: 60,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        permissions: { channels: {}, channelGroups: {}, uuids: {} },
        patterns: { channels: {}, channelGroups: {}, uuids: {} },
        meta: {},
        status: 'active',
        description: 'Manually added token (unparsed)',
      };

      setTokens(prev => [tokenData, ...prev]);
      setManualTokenDialogOpen(false);
      setManualTokenInput('');

      toast({
        title: 'Token added',
        description: 'Token added (could not parse details)',
      });
    }
  }, [manualTokenInput, toast]);

  // Test token function
  const testToken = useCallback(async () => {
    if (!pubnub || !testTokenInput.trim() || !testChannel.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a token and channel to test',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      // Create PubNub instance with the token
      const testPubnubConfig: any = {
        publishKey: appSettings.credentials.publishKey || 'demo',
        subscribeKey: appSettings.credentials.subscribeKey || 'demo',
        userId: 'token-test-user',
        authKey: testTokenInput.trim(),
      };
      
      // Note: For token testing, we use the test token as authKey, not the settings PAM token
      const testPubnub = new window.PubNub(testPubnubConfig);

      let success = false;
      let message = '';

      switch (testOperation) {
        case 'publish':
          try {
            await testPubnub.publish({
              channel: testChannel,
              message: { test: 'Token validation test', timestamp: Date.now() }
            });
            success = true;
            message = 'Successfully published to channel with token';
          } catch (error: any) {
            success = false;
            message = `Publish failed: ${error.message || 'Unknown error'}`;
          }
          break;
          
        case 'subscribe':
          try {
            const channel = testPubnub.channel(testChannel);
            const subscription = channel.subscription();
            subscription.subscribe();
            
            // Wait a bit to see if subscription is successful
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            subscription.unsubscribe();
            success = true;
            message = 'Successfully subscribed to channel with token';
          } catch (error: any) {
            success = false;
            message = `Subscribe failed: ${error.message || 'Unknown error'}`;
          }
          break;
          
        case 'presence':
          try {
            const result = await testPubnub.hereNow({
              channels: [testChannel],
              includeUUIDs: false
            });
            success = true;
            message = `Successfully retrieved presence data: ${result.channels[testChannel]?.occupancy || 0} users`;
          } catch (error: any) {
            success = false;
            message = `Presence check failed: ${error.message || 'Unknown error'}`;
          }
          break;
      }
      
      setTestResult({ success, message });
      
      toast({
        title: success ? 'Token test successful' : 'Token test failed',
        description: message,
        variant: success ? 'default' : 'destructive',
      });
      
    } catch (error) {
      console.error('Test token error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setTestResult({ success: false, message });
      toast({
        title: 'Token test failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  }, [pubnub, testTokenInput, testChannel, testOperation, toast]);

  // Validate token format function
  const validateTokenFormat = useCallback((token: string): { isValid: boolean; message: string } => {
    if (!token.trim()) {
      return { isValid: false, message: 'Token cannot be empty' };
    }
    
    // Basic token format validation (PubNub tokens start with 'p' and are base64-encoded)
    if (!token.startsWith('p')) {
      return { isValid: false, message: 'Invalid token format: must start with "p"' };
    }
    
    // Check minimum length
    if (token.length < 50) {
      return { isValid: false, message: 'Token appears too short' };
    }
    
    // Try to decode as base64 (basic check)
    try {
      atob(token.substring(1));
      return { isValid: true, message: 'Token format appears valid' };
    } catch {
      return { isValid: false, message: 'Invalid token format: not valid base64' };
    }
  }, []);

  // Filter tokens based on search
  const filteredTokens = useMemo(() => {
    if (!searchTerm) return tokens;
    
    return tokens.filter(token => 
      token.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.authorizedUserId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.id.includes(searchTerm) ||
      token.status.includes(searchTerm.toLowerCase())
    );
  }, [tokens, searchTerm]);

  // Selected token data
  const selectedTokenData = useMemo(() => {
    return tokens.find(token => token.id === selectedToken);
  }, [tokens, selectedToken]);

  // Format timestamp
  const formatTimestamp = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  }, []);

  // Check if token is expired
  const isTokenExpired = useCallback((token: TokenData) => {
    return new Date() > new Date(token.expiresAt);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}

        {/* Configuration Panel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${pubnubReady ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  PubNub SDK: {pubnubReady ? 'Ready' : 'Loading...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${secretKey ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  Secret Key: {secretKey ? 'Configured' : 'Not Configured'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  appSettings.credentials.publishKey && 
                  appSettings.credentials.subscribeKey &&
                  appSettings.credentials.publishKey !== 'demo' &&
                  appSettings.credentials.subscribeKey !== 'demo'
                    ? 'bg-green-500' 
                    : 'bg-orange-500'
                }`} />
                <span className="text-sm">
                  API Keys: {
                    appSettings.credentials.publishKey && 
                    appSettings.credentials.subscribeKey &&
                    appSettings.credentials.publishKey !== 'demo' &&
                    appSettings.credentials.subscribeKey !== 'demo'
                      ? 'Configured' 
                      : appSettings.credentials.publishKey === 'demo' || appSettings.credentials.subscribeKey === 'demo'
                        ? 'Demo Keys (PAM not supported)'
                        : 'Not Configured'
                  }
                </span>
              </div>
            </div>
            
            {!secretKey && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Secret Key Required</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  A secret key is required to grant and revoke tokens. Please configure it in the{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-orange-700 underline"
                    onClick={() => window.location.href = '/settings'}
                  >
                    Settings page
                  </Button>
                  .
                </p>
              </div>
            )}
            
            {(appSettings.credentials.publishKey === 'demo' || appSettings.credentials.subscribeKey === 'demo') && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Demo Keys Do Not Support PAM</span>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  You are using demo keys which do not support Access Manager (PAM) functionality. 
                  Please configure your real PubNub publish and subscribe keys in the{' '}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-orange-700 underline"
                    onClick={() => window.location.href = '/settings'}
                  >
                    Settings page
                  </Button>
                  {' '}to use token granting and revoking features.
                </p>
              </div>
            )}
            
            {isPamConfigurationValid && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">About Access Manager (PAM)</span>
                </div>
                <p className="text-sm text-blue-700 mt-1">
                  You can create and manage tokens here even when PAM is disabled. However, for PubNub to 
                  <strong> enforce</strong> token-based access control, you must enable the "Access Manager" 
                  add-on in your PubNub Admin Portal. Tokens created while PAM is disabled will become 
                  active once you enable PAM.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-6 min-h-0">
          {/* Left Panel - Token List */}
          <div className="w-80 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Tokens ({filteredTokens.length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={!isPamConfigurationValid}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Grant New Token</DialogTitle>
                          <DialogDescription>
                            Create a new access token with specific permissions
                          </DialogDescription>
                        </DialogHeader>
                        <GrantTokenDialog 
                          grantForm={grantForm}
                          setGrantForm={setGrantForm}
                          onGrant={grantToken}
                          isGranting={isGranting}
                          onCancel={() => setGrantDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={manualTokenDialogOpen} onOpenChange={setManualTokenDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!pubnubReady}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add Token
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Token Manually</DialogTitle>
                          <DialogDescription>
                            Paste a token that you received from the curl command
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="manualToken">Token</Label>
                            <Textarea
                              id="manualToken"
                              placeholder="Paste your token here..."
                              value={manualTokenInput}
                              onChange={(e) => setManualTokenInput(e.target.value)}
                              className="font-mono text-xs min-h-[100px]"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setManualTokenDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={addManualToken}
                            disabled={!manualTokenInput.trim()}
                          >
                            Add Token
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={parseDialogOpen} onOpenChange={setParseDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!pubnubReady}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>Parse Token</DialogTitle>
                          <DialogDescription>
                            Decode a token to view its permissions and metadata
                          </DialogDescription>
                        </DialogHeader>
                        <ParseTokenDialog 
                          parseTokenInput={parseTokenInput}
                          setParseTokenInput={setParseTokenInput}
                          parsedTokenResult={parsedTokenResult}
                          onParse={parseToken}
                          isParsing={isParsing}
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!isPamConfigurationValid}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Revoke Token</DialogTitle>
                          <DialogDescription>
                            Revoke an existing token to remove all permissions
                          </DialogDescription>
                        </DialogHeader>
                        <RevokeTokenDialog 
                          revokeTokenInput={revokeTokenInput}
                          setRevokeTokenInput={setRevokeTokenInput}
                          onRevoke={revokeToken}
                          isRevoking={isRevoking}
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={!pubnubReady}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Test Token</DialogTitle>
                          <DialogDescription>
                            Validate and test a token's permissions by performing operations
                          </DialogDescription>
                        </DialogHeader>
                        <TestTokenDialog 
                          testTokenInput={testTokenInput}
                          setTestTokenInput={setTestTokenInput}
                          testOperation={testOperation}
                          setTestOperation={setTestOperation}
                          testChannel={testChannel}
                          setTestChannel={setTestChannel}
                          testResult={testResult}
                          onTest={testToken}
                          isTesting={isTesting}
                          validateTokenFormat={validateTokenFormat}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Curl Command Display */}
                  {(grantTokenCurl || revokeTokenCurl) && (
                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-orange-800">
                          Manual Execution Required
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {grantTokenCurl && (
                          <div>
                            <Label className="text-sm font-medium text-orange-700">Grant Token Command:</Label>
                            <div className="flex gap-2 mt-1">
                              <Textarea
                                value={grantTokenCurl}
                                readOnly
                                className="font-mono text-xs min-h-[100px] flex-1"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(grantTokenCurl);
                                  toast({ title: 'Copied!', description: 'Grant token curl command copied to clipboard' });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-xs text-orange-600 mt-1 space-y-1">
                              <p><strong>Instructions:</strong></p>
                              <p>1. Run this curl command in your terminal</p>
                              <p>2. Look for a long base64 token string in the response</p>
                              <p>3. If you get "[]" or HTTP Status 200, the request worked but check the response format</p>
                              <p>4. Copy the token and click the "Add Token" button above to add it to your list</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setGrantTokenCurl('')}
                              className="mt-2 text-orange-700 hover:text-orange-800"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          </div>
                        )}
                        
                        {revokeTokenCurl && (
                          <div>
                            <Label className="text-sm font-medium text-orange-700">Revoke Token Command:</Label>
                            <div className="flex gap-2 mt-1">
                              <Textarea
                                value={revokeTokenCurl}
                                readOnly
                                className="font-mono text-xs min-h-[60px] flex-1"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(revokeTokenCurl);
                                  toast({ title: 'Copied!', description: 'Revoke token curl command copied to clipboard' });
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-orange-600 mt-1">
                              Run this curl command in your terminal to revoke the token.
                            </p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRevokeTokenCurl('')}
                              className="mt-2 text-orange-700 hover:text-orange-800"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search tokens..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredTokens.map((token) => (
                      <div
                        key={token.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedToken === token.id
                            ? 'border-pubnub-blue bg-pubnub-blue/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedToken(token.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-sm">
                              {token.description || `Token ${token.id.slice(-4)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {token.status === 'active' && !isTokenExpired(token) && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {token.status === 'revoked' && (
                              <Lock className="h-4 w-4 text-red-500" />
                            )}
                            {isTokenExpired(token) && (
                              <Clock className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          {token.authorizedUserId && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{token.authorizedUserId}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {isTokenExpired(token) ? 'Expired' : `Expires ${formatTimestamp(token.expiresAt)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {filteredTokens.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {tokens.length === 0 ? 'No tokens created yet' : 'No tokens match your search'}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Token Details */}
          <div className="flex-1">
            {selectedTokenData ? (
              <TokenDetailsPanel 
                token={selectedTokenData}
                onCopy={copyToClipboard}
                isExpired={isTokenExpired(selectedTokenData)}
                formatTimestamp={formatTimestamp}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="text-gray-400 h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Token</h3>
                  <p className="text-gray-600 mb-6">Choose a token from the list to view its details and permissions</p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>• View token permissions and metadata</p>
                    <p>• Copy tokens to clipboard</p>
                    <p>• Monitor token status and expiration</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Grant Token Dialog Component
function GrantTokenDialog({ 
  grantForm, 
  setGrantForm, 
  onGrant, 
  isGranting,
  onCancel
}: {
  grantForm: any;
  setGrantForm: (form: any) => void;
  onGrant: () => void;
  isGranting: boolean;
  onCancel: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'channels' | 'groups' | 'uuids' | 'patterns' | 'meta'>('channels');

  // Channel functions
  const addChannel = () => {
    setGrantForm(prev => ({
      ...prev,
      channels: [...prev.channels, { name: '', permissions: { read: false, write: false } }]
    }));
  };

  const removeChannel = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channels: prev.channels.filter((_, i) => i !== index)
    }));
  };

  const updateChannel = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channels: prev.channels.map((channel, i) => 
        i === index ? { ...channel, [field]: value } : channel
      )
    }));
  };

  // Channel Group functions
  const addChannelGroup = () => {
    setGrantForm(prev => ({
      ...prev,
      channelGroups: [...prev.channelGroups, { name: '', permissions: { read: false, manage: false } }]
    }));
  };

  const removeChannelGroup = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroups: prev.channelGroups.filter((_, i) => i !== index)
    }));
  };

  const updateChannelGroup = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroups: prev.channelGroups.map((group, i) => 
        i === index ? { ...group, [field]: value } : group
      )
    }));
  };

  // UUID functions
  const addUuid = () => {
    setGrantForm(prev => ({
      ...prev,
      uuids: [...prev.uuids, { name: '', permissions: { get: false, update: false, delete: false } }]
    }));
  };

  const removeUuid = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      uuids: prev.uuids.filter((_, i) => i !== index)
    }));
  };

  const updateUuid = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      uuids: prev.uuids.map((uuid, i) => 
        i === index ? { ...uuid, [field]: value } : uuid
      )
    }));
  };

  // Channel Pattern functions
  const addChannelPattern = () => {
    setGrantForm(prev => ({
      ...prev,
      channelPatterns: [...prev.channelPatterns, { pattern: '', permissions: { read: false, write: false } }]
    }));
  };

  const removeChannelPattern = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channelPatterns: prev.channelPatterns.filter((_, i) => i !== index)
    }));
  };

  const updateChannelPattern = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channelPatterns: prev.channelPatterns.map((pattern, i) => 
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  // Channel Group Pattern functions
  const addChannelGroupPattern = () => {
    setGrantForm(prev => ({
      ...prev,
      channelGroupPatterns: [...prev.channelGroupPatterns, { pattern: '', permissions: { read: false, manage: false } }]
    }));
  };

  const removeChannelGroupPattern = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroupPatterns: prev.channelGroupPatterns.filter((_, i) => i !== index)
    }));
  };

  const updateChannelGroupPattern = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      channelGroupPatterns: prev.channelGroupPatterns.map((pattern, i) => 
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  // UUID Pattern functions
  const addUuidPattern = () => {
    setGrantForm(prev => ({
      ...prev,
      uuidPatterns: [...prev.uuidPatterns, { pattern: '', permissions: { get: false, update: false, delete: false } }]
    }));
  };

  const removeUuidPattern = (index: number) => {
    setGrantForm(prev => ({
      ...prev,
      uuidPatterns: prev.uuidPatterns.filter((_, i) => i !== index)
    }));
  };

  const updateUuidPattern = (index: number, field: string, value: any) => {
    setGrantForm(prev => ({
      ...prev,
      uuidPatterns: prev.uuidPatterns.map((pattern, i) => 
        i === index ? { ...pattern, [field]: value } : pattern
      )
    }));
  };

  // Metadata functions
  const addMetadata = () => {
    const key = `key${Object.keys(grantForm.meta).length + 1}`;
    setGrantForm(prev => ({
      ...prev,
      meta: { ...prev.meta, [key]: '' }
    }));
  };

  const removeMetadata = (key: string) => {
    setGrantForm(prev => {
      const newMeta = { ...prev.meta };
      delete newMeta[key];
      return { ...prev, meta: newMeta };
    });
  };

  const updateMetadata = (oldKey: string, newKey: string, value: string) => {
    setGrantForm(prev => {
      const newMeta = { ...prev.meta };
      if (oldKey !== newKey) {
        delete newMeta[oldKey];
      }
      newMeta[newKey] = value;
      return { ...prev, meta: newMeta };
    });
  };

  const validateForm = () => {
    const hasResources = grantForm.channels.length > 0 || 
                        grantForm.channelGroups.length > 0 || 
                        grantForm.uuids.length > 0;
    const hasPatterns = grantForm.channelPatterns.length > 0 || 
                       grantForm.channelGroupPatterns.length > 0 || 
                       grantForm.uuidPatterns.length > 0;
    
    return hasResources || hasPatterns;
  };

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ttl">TTL (minutes) *</Label>
          <Input
            id="ttl"
            type="number"
            min="1"
            max="43200"
            value={grantForm.ttl}
            onChange={(e) => setGrantForm(prev => ({ ...prev, ttl: parseInt(e.target.value) || 60 }))}
          />
          <p className="text-xs text-gray-500 mt-1">Min: 1, Max: 43,200 (30 days)</p>
        </div>
        <div>
          <Label htmlFor="authorizedUserId">Authorized User ID (optional)</Label>
          <Input
            id="authorizedUserId"
            value={grantForm.authorizedUserId}
            onChange={(e) => setGrantForm(prev => ({ ...prev, authorizedUserId: e.target.value }))}
            placeholder="user-123"
          />
          <p className="text-xs text-gray-500 mt-1">Restricts token to specific user</p>
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          value={grantForm.description}
          onChange={(e) => setGrantForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Token description"
        />
      </div>

      {/* Tabs for different permission types */}
      <div>
        <div className="flex border-b border-gray-200 mb-4">
          {[
            { id: 'channels', label: 'Channels', icon: Hash, count: grantForm.channels.length },
            { id: 'groups', label: 'Channel Groups', icon: Layers, count: grantForm.channelGroups.length },
            { id: 'uuids', label: 'UUIDs', icon: Users, count: grantForm.uuids.length },
            { id: 'patterns', label: 'Patterns', icon: FileText, count: grantForm.channelPatterns.length + grantForm.channelGroupPatterns.length + grantForm.uuidPatterns.length },
            { id: 'meta', label: 'Metadata', icon: Settings, count: Object.keys(grantForm.meta).length },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-pubnub-blue text-pubnub-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Channel Permissions Tab */}
        {activeTab === 'channels' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Channel Permissions</Label>
              <Button onClick={addChannel} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Channel
              </Button>
            </div>
            <div className="space-y-3">
              {grantForm.channels.map((channel: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      placeholder="Channel name (e.g., chat-room-1)"
                      value={channel.name}
                      onChange={(e) => updateChannel(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeChannel(index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['read', 'write', 'get', 'manage', 'update', 'join', 'delete'] as const).map(permission => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`channel-${index}-${permission}`}
                          checked={channel.permissions[permission] || false}
                          onCheckedChange={(checked) => 
                            updateChannel(index, 'permissions', {
                              ...channel.permissions,
                              [permission]: checked
                            })
                          }
                        />
                        <Label htmlFor={`channel-${index}-${permission}`} className="text-sm">
                          {permission}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grantForm.channels.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Hash className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No channels added yet</p>
                  <p className="text-sm">Add channels to grant specific permissions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Channel Groups Tab */}
        {activeTab === 'groups' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Channel Group Permissions</Label>
              <Button onClick={addChannelGroup} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Channel Group
              </Button>
            </div>
            <div className="space-y-3">
              {grantForm.channelGroups.map((group: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      placeholder="Channel group name (e.g., family-channels)"
                      value={group.name}
                      onChange={(e) => updateChannelGroup(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeChannelGroup(index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['read', 'manage'] as const).map(permission => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${index}-${permission}`}
                          checked={group.permissions[permission] || false}
                          onCheckedChange={(checked) => 
                            updateChannelGroup(index, 'permissions', {
                              ...group.permissions,
                              [permission]: checked
                            })
                          }
                        />
                        <Label htmlFor={`group-${index}-${permission}`} className="text-sm">
                          {permission}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grantForm.channelGroups.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Layers className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No channel groups added yet</p>
                  <p className="text-sm">Add channel groups to grant permissions</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UUIDs Tab */}
        {activeTab === 'uuids' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">UUID Permissions</Label>
              <Button onClick={addUuid} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add UUID
              </Button>
            </div>
            <div className="space-y-3">
              {grantForm.uuids.map((uuid: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      placeholder="UUID (e.g., user-123)"
                      value={uuid.name}
                      onChange={(e) => updateUuid(index, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeUuid(index)}
                      size="sm"
                      variant="outline"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {(['get', 'update', 'delete'] as const).map(permission => (
                      <div key={permission} className="flex items-center space-x-2">
                        <Checkbox
                          id={`uuid-${index}-${permission}`}
                          checked={uuid.permissions[permission] || false}
                          onCheckedChange={(checked) => 
                            updateUuid(index, 'permissions', {
                              ...uuid.permissions,
                              [permission]: checked
                            })
                          }
                        />
                        <Label htmlFor={`uuid-${index}-${permission}`} className="text-sm">
                          {permission}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {grantForm.uuids.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No UUIDs added yet</p>
                  <p className="text-sm">Add UUIDs to grant permissions for user metadata</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            {/* Channel Patterns */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Channel Patterns</Label>
                <Button onClick={addChannelPattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>
              <div className="space-y-3">
                {grantForm.channelPatterns.map((pattern: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        placeholder="RegEx pattern (e.g., ^channel-[A-Za-z0-9]+$)"
                        value={pattern.pattern}
                        onChange={(e) => updateChannelPattern(index, 'pattern', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={() => removeChannelPattern(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['read', 'write', 'get', 'manage', 'update', 'join', 'delete'] as const).map(permission => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-channel-${index}-${permission}`}
                            checked={pattern.permissions[permission] || false}
                            onCheckedChange={(checked) => 
                              updateChannelPattern(index, 'permissions', {
                                ...pattern.permissions,
                                [permission]: checked
                              })
                            }
                          />
                          <Label htmlFor={`pattern-channel-${index}-${permission}`} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Group Patterns */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Channel Group Patterns</Label>
                <Button onClick={addChannelGroupPattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>
              <div className="space-y-3">
                {grantForm.channelGroupPatterns.map((pattern: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        placeholder="RegEx pattern (e.g., ^group-[A-Za-z0-9]+$)"
                        value={pattern.pattern}
                        onChange={(e) => updateChannelGroupPattern(index, 'pattern', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={() => removeChannelGroupPattern(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(['read', 'manage'] as const).map(permission => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-group-${index}-${permission}`}
                            checked={pattern.permissions[permission] || false}
                            onCheckedChange={(checked) => 
                              updateChannelGroupPattern(index, 'permissions', {
                                ...pattern.permissions,
                                [permission]: checked
                              })
                            }
                          />
                          <Label htmlFor={`pattern-group-${index}-${permission}`} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* UUID Patterns */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">UUID Patterns</Label>
                <Button onClick={addUuidPattern} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pattern
                </Button>
              </div>
              <div className="space-y-3">
                {grantForm.uuidPatterns.map((pattern: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        placeholder="RegEx pattern (e.g., ^user-[A-Za-z0-9]+$)"
                        value={pattern.pattern}
                        onChange={(e) => updateUuidPattern(index, 'pattern', e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                      <Button
                        onClick={() => removeUuidPattern(index)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {(['get', 'update', 'delete'] as const).map(permission => (
                        <div key={permission} className="flex items-center space-x-2">
                          <Checkbox
                            id={`pattern-uuid-${index}-${permission}`}
                            checked={pattern.permissions[permission] || false}
                            onCheckedChange={(checked) => 
                              updateUuidPattern(index, 'permissions', {
                                ...pattern.permissions,
                                [permission]: checked
                              })
                            }
                          />
                          <Label htmlFor={`pattern-uuid-${index}-${permission}`} className="text-sm">
                            {permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(grantForm.channelPatterns.length === 0 && grantForm.channelGroupPatterns.length === 0 && grantForm.uuidPatterns.length === 0) && (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No patterns added yet</p>
                <p className="text-sm">Use RegEx patterns to grant permissions to multiple resources</p>
              </div>
            )}
          </div>
        )}

        {/* Metadata Tab */}
        {activeTab === 'meta' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Metadata</Label>
              <Button onClick={addMetadata} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Metadata
              </Button>
            </div>
            <div className="space-y-3">
              {Object.entries(grantForm.meta).map(([key, value], index) => (
                <div key={key} className="border rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Key"
                      value={key}
                      onChange={(e) => updateMetadata(key, e.target.value, value as string)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Value"
                        value={value as string}
                        onChange={(e) => updateMetadata(key, key, e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={() => removeMetadata(key)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(grantForm.meta).length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No metadata added yet</p>
                  <p className="text-sm">Add custom metadata to include with the token</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Validation Warning */}
      {!validateForm() && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-800">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Validation Required</span>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            You must specify permissions for at least one resource (channels, channel groups, or UUIDs) or pattern.
          </p>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onGrant} disabled={isGranting || !validateForm()}>
          {isGranting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Granting...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Grant Token
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Test Token Dialog Component
function TestTokenDialog({
  testTokenInput,
  setTestTokenInput,
  testOperation,
  setTestOperation,
  testChannel,
  setTestChannel,
  testResult,
  onTest,
  isTesting,
  validateTokenFormat
}: {
  testTokenInput: string;
  setTestTokenInput: (value: string) => void;
  testOperation: 'publish' | 'subscribe' | 'presence';
  setTestOperation: (operation: 'publish' | 'subscribe' | 'presence') => void;
  testChannel: string;
  setTestChannel: (value: string) => void;
  testResult: { success: boolean; message: string } | null;
  onTest: () => void;
  isTesting: boolean;
  validateTokenFormat: (token: string) => { isValid: boolean; message: string };
}) {
  const validation = validateTokenFormat(testTokenInput);
  
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="testToken">Token to Test</Label>
        <Textarea
          id="testToken"
          placeholder="Paste your token here..."
          value={testTokenInput}
          onChange={(e) => setTestTokenInput(e.target.value)}
          rows={3}
        />
        {testTokenInput && (
          <div className={`mt-2 text-sm flex items-center gap-2 ${
            validation.isValid ? 'text-green-600' : 'text-red-600'
          }`}>
            {validation.isValid ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {validation.message}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="testChannel">Test Channel</Label>
          <Input
            id="testChannel"
            placeholder="test-channel"
            value={testChannel}
            onChange={(e) => setTestChannel(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="testOperation">Operation</Label>
          <Select value={testOperation} onValueChange={setTestOperation as any}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publish">Publish Message</SelectItem>
              <SelectItem value="subscribe">Subscribe to Channel</SelectItem>
              <SelectItem value="presence">Check Presence</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Test Description</h4>
        <p className="text-sm text-gray-600">
          {testOperation === 'publish' && 'This will attempt to publish a test message to the specified channel using the token.'}
          {testOperation === 'subscribe' && 'This will attempt to subscribe to the specified channel using the token.'}
          {testOperation === 'presence' && 'This will attempt to retrieve presence information for the specified channel using the token.'}
        </p>
      </div>
      
      {testResult && (
        <div className={`border rounded-lg p-4 ${
          testResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.success ? 'Test Passed' : 'Test Failed'}
            </span>
          </div>
          <p className={`text-sm ${
            testResult.success ? 'text-green-700' : 'text-red-700'
          }`}>
            {testResult.message}
          </p>
        </div>
      )}
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setTestTokenInput('')}>
          Clear
        </Button>
        <Button 
          onClick={onTest} 
          disabled={isTesting || !validation.isValid || !testChannel.trim()}
        >
          {isTesting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Test Token
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Parse Token Dialog Component
function ParseTokenDialog({
  parseTokenInput,
  setParseTokenInput,
  parsedTokenResult,
  onParse,
  isParsing
}: {
  parseTokenInput: string;
  setParseTokenInput: (value: string) => void;
  parsedTokenResult: ParsedToken | null;
  onParse: () => void;
  isParsing: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="parseToken">Token to Parse</Label>
        <Textarea
          id="parseToken"
          placeholder="Paste your token here..."
          value={parseTokenInput}
          onChange={(e) => setParseTokenInput(e.target.value)}
          rows={3}
        />
      </div>
      
      {parsedTokenResult && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h4 className="font-semibold mb-2">Parsed Token Details</h4>
          <pre className="text-sm bg-white p-3 rounded border overflow-auto">
            {JSON.stringify(parsedTokenResult, null, 2)}
          </pre>
        </div>
      )}
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setParseTokenInput('')}>
          Clear
        </Button>
        <Button onClick={onParse} disabled={isParsing || !parseTokenInput.trim()}>
          {isParsing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Parse Token
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Revoke Token Dialog Component
function RevokeTokenDialog({
  revokeTokenInput,
  setRevokeTokenInput,
  onRevoke,
  isRevoking
}: {
  revokeTokenInput: string;
  setRevokeTokenInput: (value: string) => void;
  onRevoke: () => void;
  isRevoking: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="revokeToken">Token to Revoke</Label>
        <Textarea
          id="revokeToken"
          placeholder="Paste the token you want to revoke..."
          value={revokeTokenInput}
          onChange={(e) => setRevokeTokenInput(e.target.value)}
          rows={3}
        />
      </div>
      
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <span className="font-medium">Warning</span>
        </div>
        <p className="text-sm text-red-700 mt-1">
          Revoking a token will immediately remove all permissions. This action cannot be undone.
        </p>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setRevokeTokenInput('')}>
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          onClick={onRevoke} 
          disabled={isRevoking || !revokeTokenInput.trim()}
        >
          {isRevoking ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Revoking...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Revoke Token
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Token Details Panel Component
function TokenDetailsPanel({
  token,
  onCopy,
  isExpired,
  formatTimestamp
}: {
  token: TokenData;
  onCopy: (text: string, description: string) => void;
  isExpired: boolean;
  formatTimestamp: (timestamp: string) => string;
}) {
  return (
    <div className="space-y-4">
      {/* Token Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {token.description || `Token ${token.id.slice(-4)}`}
            </div>
            <div className="flex items-center gap-2">
              {token.status === 'active' && !isExpired && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </span>
              )}
              {token.status === 'revoked' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                  <Lock className="h-3 w-3" />
                  Revoked
                </span>
              )}
              {isExpired && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                  <Clock className="h-3 w-3" />
                  Expired
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Created</Label>
              <p className="text-sm text-gray-900">{formatTimestamp(token.createdAt)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Expires</Label>
              <p className="text-sm text-gray-900">{formatTimestamp(token.expiresAt)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">TTL</Label>
              <p className="text-sm text-gray-900">{token.ttl} minutes</p>
            </div>
            {token.authorizedUserId && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Authorized User</Label>
                <p className="text-sm text-gray-900">{token.authorizedUserId}</p>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-gray-700">Token</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(token.token, 'Token')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs break-all">
              {token.token}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      {(token.permissions.channels || token.permissions.channelGroups || token.permissions.uuids) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Resource Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {token.permissions.channels && Object.keys(token.permissions.channels).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Channels
                  </Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.permissions.channels).map(([channel, perms]) => (
                      <div key={channel} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{channel}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {token.permissions.channelGroups && Object.keys(token.permissions.channelGroups).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Channel Groups
                  </Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.permissions.channelGroups).map(([group, perms]) => (
                      <div key={group} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{group}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {token.permissions.uuids && Object.keys(token.permissions.uuids).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    UUIDs
                  </Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.permissions.uuids).map(([uuid, perms]) => (
                      <div key={uuid} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{uuid}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Permissions */}
      {(token.patterns?.channels || token.patterns?.channelGroups || token.patterns?.uuids) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pattern Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {token.patterns.channels && Object.keys(token.patterns.channels).length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Channel Patterns</Label>
                  <div className="mt-2 space-y-2">
                    {Object.entries(token.patterns.channels).map(([pattern, perms]) => (
                      <div key={pattern} className="border rounded-lg p-3">
                        <div className="font-mono text-sm mb-2 bg-gray-100 px-2 py-1 rounded">{pattern}</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(perms).map(([perm, granted]) => (
                            granted && (
                              <span key={perm} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {perm}
                              </span>
                            )
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {token.meta && Object.keys(token.meta).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-3 rounded border overflow-auto">
              {JSON.stringify(token.meta, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}