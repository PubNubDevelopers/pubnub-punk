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
import { ensurePubNubSdk } from '@/lib/sdk-loader';
import type { AppSettings } from '@/types/settings';
import {
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';

// Import types
import type { 
  TokenData, 
  ParsedToken, 
  ChannelPermissions, 
  ChannelGroupPermissions, 
  UuidPermissions,
  GrantRequest,
  GrantForm 
} from '@/types/access-manager';

// Import API functions
import {
  executeGrantTokenRequest,
  executeRevokeTokenRequest
} from '@/lib/access-manager/api';

// Import utility functions
import {
  FIELD_DEFINITIONS,
  DEFAULT_GRANT_FORM
} from '@/lib/access-manager/utils';

// Import UI components
import {
  GrantTokenDialog
} from '@/components/access-manager';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const loadSettingsWithoutSecret = (): AppSettings => storage.getSettings();

export default function AccessManagerPage() {
  const { toast } = useToast();
  const { setPageSettings, setConfigType } = useConfig();
  
  // State for PubNub availability and instance
  const [mounted, setMounted] = useState(false);
  const [pubnubReady, setPubnubReady] = useState(false);
  const [pubnub, setPubnub] = useState<any>(null);
  
  // App settings (sans secret key) and ephemeral secret key for this session
  const [settings, setSettings] = useState<AppSettings>(() => loadSettingsWithoutSecret());
  const [sessionSecretKey, setSessionSecretKey] = useState('');
  
  // Loading states
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // Generated token state
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Panel states
  const [createTokenExpanded, setCreateTokenExpanded] = useState(false);
  
  // Grant token form state
  const [grantForm, setGrantForm] = useState<GrantForm>(DEFAULT_GRANT_FORM);
  
  // Parse token state
  const [parseTokenInput, setParseTokenInput] = useState('');
  const [parsedTokenResult, setParsedTokenResult] = useState<ParsedToken | null>(null);
  
  // Revoke token state
  const [revokeTokenInput, setRevokeTokenInput] = useState('');
  
  

  // Curl command state
  const [grantTokenCurl, setGrantTokenCurl] = useState('');
  const [revokeTokenCurl, setRevokeTokenCurl] = useState('');
  

  // Helper function to check if PAM operations are available
  const isPamConfigurationValid = useMemo(() => {
    const trimmedSecret = sessionSecretKey.trim();
    const { publishKey, subscribeKey } = settings.credentials;
    return Boolean(pubnubReady &&
      trimmedSecret &&
      publishKey &&
      subscribeKey &&
      publishKey !== 'demo' &&
      subscribeKey !== 'demo');
  }, [
    pubnubReady,
    sessionSecretKey,
    settings.credentials.publishKey,
    settings.credentials.subscribeKey,
  ]);
  
  // Mount check
  useEffect(() => {
    setMounted(true);
  }, []);

  // Set config type for the config service
  useEffect(() => {
    setConfigType('ACCESS_MANAGER');
  }, [setConfigType]);

  useEffect(() => {
    setPageSettings({
      accessManager: {
        tokens: FIELD_DEFINITIONS['accessManager.tokens'].default,
      },
      configForSaving: {
        tokens: FIELD_DEFINITIONS['accessManager.tokens'].default,
        secretKeyConfigured: Boolean(sessionSecretKey.trim()),
        timestamp: new Date().toISOString(),
      }
    });
  }, [setPageSettings, sessionSecretKey]);
  
  // Check for PubNub availability on mount and create instance
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    const initialize = async () => {
      try {
        await ensurePubNubSdk(settings.sdkVersion);
        if (cancelled || typeof window === 'undefined' || !window.PubNub) {
          throw new Error('PubNub SDK not available');
        }

        const pubnubConfig: any = {
          publishKey: settings.credentials.publishKey || 'demo',
          subscribeKey: settings.credentials.subscribeKey || 'demo',
          userId: settings.credentials.userId || 'access-manager-user',
          enableEventEngine: settings.environment.enableEventEngine,
        };

        if (settings.credentials.pamToken) {
          pubnubConfig.authKey = settings.credentials.pamToken;
        }

        const pubnubInstance = new window.PubNub(pubnubConfig);
        if (!cancelled) {
          setPubnubReady(true);
          setPubnub((prev: any) => {
            prev?.destroy?.();
            return pubnubInstance;
          });
        } else {
          pubnubInstance.destroy?.();
        }
      } catch (error) {
        console.error('Failed to initialize PubNub SDK for Access Manager:', error);
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [mounted, settings]);

  // Load app settings on mount (sans secret key)
  useEffect(() => {
    setSettings(loadSettingsWithoutSecret());
  }, []);

  // Revoke token function
  const revokeToken = useCallback(async () => {
    // Refresh settings to ensure we have the latest configuration
    const currentSettings = storage.getSettings();
    await ensurePubNubSdk(currentSettings.sdkVersion);
    setSettings(currentSettings);
    const currentSecretKey = sessionSecretKey.trim();
    
    if (!pubnub || !currentSecretKey || !revokeTokenInput.trim()) {
      toast({
        title: 'Configuration Required',
        description: 'Paste your PubNub secret key above and provide a token to revoke.',
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

      // Execute revoke token via HTTP request
      const { curlCommand } = await executeRevokeTokenRequest(
        currentSettings.credentials.subscribeKey,
        currentSettings.credentials.publishKey,
        currentSecretKey,
        revokeTokenInput.trim()
      );

      // Store the curl command for display in the UI
      setRevokeTokenCurl(curlCommand);

      // Clear the input after successful revocation
      setRevokeTokenInput('');

      // Show success message
      toast({
        title: 'Token Revoked Successfully',
        description: 'The token has been permanently revoked via HTTP request.',
        duration: 5000,
      });
      
    } catch (error) {
      toast({
        title: 'Revoke token failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsRevoking(false);
    }
  }, [pubnub, revokeTokenInput, sessionSecretKey, toast, setSettings]);

  // Parse token function
  const parseToken = useCallback(async () => {
    if (!pubnub || !parseTokenInput.trim()) {
      toast({
        title: 'Token required',
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

  // Copy to clipboard helper
  const copyToClipboard = useCallback((text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: `${description} has been copied to your clipboard`,
    });
  }, [toast]);



  // Grant token function
  const grantToken = useCallback(async () => {
    // Refresh settings (sans secret) and ensure we have the latest configuration
    const currentSettings = storage.getSettings();
    await ensurePubNubSdk(currentSettings.sdkVersion);
    setSettings(currentSettings);
    const currentSecretKey = sessionSecretKey.trim();
    
    if (!pubnub || !currentSecretKey) {
      toast({
        title: 'Configuration Required',
        description: 'Paste your PubNub secret key above before generating a token.',
        variant: 'destructive',
      });
      return;
    }

    setIsGranting(true);
    
    try {
      // Check if we have real keys (not demo keys)
      if (!currentSettings.credentials.publishKey || !currentSettings.credentials.subscribeKey || 
          currentSettings.credentials.publishKey === 'demo' || currentSettings.credentials.subscribeKey === 'demo') {
        throw new Error('Real PubNub keys are required for Access Manager operations. Demo keys do not support PAM functionality.');
      }

      // Build the grant request from the form
      const grantRequest: any = {
        ttl: grantForm.ttl,
        meta: Object.keys(grantForm.meta).length > 0 ? grantForm.meta : undefined,
      };

      // Only add authorized_uuid if it's provided (note: snake_case for SDK)
      if (grantForm.authorizedUserId?.trim()) {
        grantRequest.authorized_uuid = grantForm.authorizedUserId.trim();
      }

      // Convert form arrays to resource objects - only add resources if there are any
      const resources: any = {};
      if (grantForm.channels.length > 0) {
        resources.channels = {};
        grantForm.channels.forEach(channel => {
          if (channel.name) {
            resources.channels[channel.name] = channel.permissions;
          }
        });
      }

      if (grantForm.channelGroups.length > 0) {
        resources.groups = {};
        grantForm.channelGroups.forEach(group => {
          if (group.name) {
            resources.groups[group.name] = group.permissions;
          }
        });
      }

      if (grantForm.uuids.length > 0) {
        resources.uuids = {};
        grantForm.uuids.forEach(uuid => {
          if (uuid.name) {
            resources.uuids[uuid.name] = uuid.permissions;
          }
        });
      }

      // Only add resources if at least one type is defined
      if (Object.keys(resources).length > 0) {
        grantRequest.resources = resources;
      }

      // Convert pattern arrays to pattern objects - only add patterns if there are any
      const patterns: any = {};
      if (grantForm.channelPatterns.length > 0) {
        patterns.channels = {};
        grantForm.channelPatterns.forEach(pattern => {
          if (pattern.pattern) {
            patterns.channels[pattern.pattern] = pattern.permissions;
          }
        });
      }

      if (grantForm.channelGroupPatterns.length > 0) {
        patterns.groups = {};
        grantForm.channelGroupPatterns.forEach(pattern => {
          if (pattern.pattern) {
            patterns.groups[pattern.pattern] = pattern.permissions;
          }
        });
      }

      if (grantForm.uuidPatterns.length > 0) {
        patterns.uuids = {};
        grantForm.uuidPatterns.forEach(pattern => {
          if (pattern.pattern) {
            patterns.uuids[pattern.pattern] = pattern.permissions;
          }
        });
      }

      // Only add patterns if at least one type is defined
      if (Object.keys(patterns).length > 0) {
        grantRequest.patterns = patterns;
      }

      // Validate secret key format (should start with 'sec-c-')
      if (!currentSecretKey.startsWith('sec-c-')) {
        throw new Error('Invalid secret key format. Secret keys should start with "sec-c-"');
      }

      // Execute grant token via HTTP request
      console.log('Granting token via HTTP with request:', JSON.stringify(grantRequest, null, 2));
      const { token, curlCommand } = await executeGrantTokenRequest(
        currentSettings.credentials.subscribeKey,
        currentSettings.credentials.publishKey,
        currentSecretKey,
        grantRequest
      );
      setGrantTokenCurl(curlCommand);
      console.log('Token granted successfully via HTTP:', token);

      // Store the generated token for display
      setGeneratedToken(token);

      // Show success message
      toast({
        title: 'Token Generated Successfully',
        description: 'Your PAM token has been created. Copy it below.',
        duration: 5000,
      });

      // Clear the form after successful grant
      setGrantForm(DEFAULT_GRANT_FORM);

    } catch (error) {
      console.error('Grant token error:', error);
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      toast({
        title: 'Grant token failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  }, [pubnub, grantForm, sessionSecretKey, toast, setSettings]);










  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">

      {/* Secret Key Notice */}
      <div className="mb-6 space-y-4">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5 text-orange-600" />
            <p className="text-sm text-orange-700">
              Note: You should store your PubNub Secret Key securely and carefully. If you paste it here, it will only be used for transactions on this page; as soon as you navigate away from this page it will be erased. It is not stored in your browser.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="access-manager-secret-key" className="text-sm font-medium text-gray-700">
            Session Secret Key
          </Label>
          <Input
            id="access-manager-secret-key"
            type="password"
            placeholder="sec-c-..."
            value={sessionSecretKey}
            onChange={(event) => setSessionSecretKey(event.target.value)}
            autoComplete="off"
          />
          {!sessionSecretKey.trim() && (
            <p className="text-sm text-orange-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Enter your secret key above to enable grant and revoke operations.
            </p>
          )}
        </div>
      </div>

      {/* Demo Keys Warning */}
      {pubnubReady && 
       settings.credentials.publishKey && 
       settings.credentials.subscribeKey && 
       (settings.credentials.publishKey === 'demo' || settings.credentials.subscribeKey === 'demo') && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Demo Keys Detected</h3>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Access Manager requires real PubNub keys. Demo keys do not support PAM functionality.
          </p>
        </div>
      )}

      {/* Generated Token Display */}
      {generatedToken && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Token Generated Successfully</h3>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  copyToClipboard(generatedToken, 'Token');
                  toast({
                    title: 'Copied',
                    description: 'Token copied to clipboard',
                  });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Token
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setGeneratedToken(null);
                  setGrantTokenCurl('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="bg-white p-3 rounded border border-green-200 font-mono text-xs break-all overflow-x-auto">
            {generatedToken}
          </div>
          <p className="text-sm text-green-700 mt-3">
            This token can be used to authenticate requests with the specified permissions.
            Store it securely - you can copy it now or paste it in Settings → PAM Token field.
          </p>
        </div>
      )}

      {/* Revoke Curl Command Display */}
      {revokeTokenCurl && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Token Revoked - curl Command Used</h3>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(revokeTokenCurl, 'Curl command')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRevokeTokenCurl('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <pre className="bg-white p-3 rounded border border-green-200 overflow-x-auto text-sm">
            {revokeTokenCurl}
          </pre>
          <p className="text-sm text-green-700 mt-2">
            This curl command was used to revoke the token via HTTP request.
          </p>
        </div>
      )}

      {/* Create Token Panel */}
      <div className="mb-6">
        <Card>
          <Collapsible open={createTokenExpanded} onOpenChange={setCreateTokenExpanded}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-green-600" />
                Create Access Token
              </CardTitle>
              <p className="text-sm text-gray-600">
                Generate new tokens with specific permissions for your PubNub resources.
              </p>
            </CardHeader>
            <CardContent>
              {!createTokenExpanded ? (
                <div className="text-center py-8">
                  <CollapsibleTrigger asChild>
                    <Button disabled={!isPamConfigurationValid}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Token
                    </Button>
                  </CollapsibleTrigger>
                </div>
              ) : (
                <CollapsibleContent>
                  <div className="space-y-4">
                    <GrantTokenDialog
                      grantForm={grantForm}
                      setGrantForm={setGrantForm}
                      onGrant={grantToken}
                      isGranting={isGranting}
                      onCancel={() => {
                        setCreateTokenExpanded(false);
                        setGeneratedToken(null);
                        setGrantForm(DEFAULT_GRANT_FORM);
                      }}
                    />
                  </div>
                </CollapsibleContent>
              )}
            </CardContent>
          </Collapsible>
        </Card>
      </div>

      {/* Token Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revoke Token Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-600" />
              Revoke Access Token
            </CardTitle>
            <p className="text-sm text-gray-600">
              Permanently revoke an existing access token.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="revokeTokenInput">Token to Revoke</Label>
                <Textarea
                  id="revokeTokenInput"
                  placeholder="Paste the token to revoke here..."
                  value={revokeTokenInput}
                  onChange={(e) => setRevokeTokenInput(e.target.value)}
                  rows={3}
                  disabled={!pubnubReady}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={revokeToken} 
                  disabled={isRevoking || !revokeTokenInput.trim() || !isPamConfigurationValid}
                  variant="destructive"
                >
                  {isRevoking ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Revoke Token
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setRevokeTokenInput('')}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Parse Token Panel */}
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Parse Access Token
          </CardTitle>
          <p className="text-sm text-gray-600">
            Paste a token below to decode and inspect its permissions
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="parseTokenInput">Token to Parse</Label>
              <Textarea
                id="parseTokenInput"
                placeholder="Paste your token here..."
                value={parseTokenInput}
                onChange={(e) => setParseTokenInput(e.target.value)}
                rows={3}
                disabled={!pubnubReady}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={parseToken} 
                disabled={isParsing || !parseTokenInput.trim() || !pubnubReady}
              >
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
              <Button 
                variant="outline" 
                onClick={() => {
                  setParseTokenInput('');
                  setParsedTokenResult(null);
                }}
              >
                Clear
              </Button>
            </div>
            
            {parsedTokenResult && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Parsed Token Details</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(parsedTokenResult, null, 2), 'Parsed token details')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="bg-white rounded border max-h-96 overflow-auto">
                  <pre className="text-sm p-3 whitespace-pre-wrap">
                    {JSON.stringify(parsedTokenResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      </div>





    </div>
  );
}
