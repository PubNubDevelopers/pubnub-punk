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
  GrantRequest 
} from '@/types/access-manager';

// Import API functions
import { 
  generateGrantTokenCurl, 
  generateRevokeTokenCurl 
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
  
  
  // Loading states
  const [isGranting, setIsGranting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  
  // Panel states
  const [createTokenExpanded, setCreateTokenExpanded] = useState(false);
  
  // Grant token form state
  const [grantForm, setGrantForm] = useState(DEFAULT_GRANT_FORM);
  
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
    const currentSettings = storage.getSettings();
    return pubnubReady && 
           currentSettings.credentials.secretKey && 
           currentSettings.credentials.publishKey && 
           currentSettings.credentials.subscribeKey &&
           currentSettings.credentials.publishKey !== 'demo' && 
           currentSettings.credentials.subscribeKey !== 'demo';
  }, [pubnubReady, appSettings]);
  
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
      },
      configForSaving: {
        tokens: FIELD_DEFINITIONS['accessManager.tokens'].default,
        secretKeyConfigured: !!secretKey,
        timestamp: new Date().toISOString(),
      }
    });
  }, [setConfigType, setPageSettings, secretKey]);
  
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

      // Generate curl command for manual execution
      const curlCommand = await generateRevokeTokenCurl(
        currentSettings.credentials.subscribeKey,
        currentSettings.credentials.publishKey,
        currentSecretKey,
        revokeTokenInput.trim()
      );
      
      // Store the curl command for display in the UI
      setRevokeTokenCurl(curlCommand);
      
      // Show success message with instructions
      toast({
        title: 'Curl command generated',
        description: 'Run the curl command above to revoke the token',
        duration: 8000,
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
  }, [pubnub, revokeTokenInput, toast]);

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
    // Refresh settings to ensure we have the latest configuration
    const currentSettings = storage.getSettings();
    const currentSecretKey = currentSettings.credentials.secretKey;
    
    if (!pubnub || !currentSecretKey) {
      toast({
        title: 'Configuration Required',
        description: 'Please configure your PubNub keys and secret key in the main settings',
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
      const grantRequest: GrantRequest = {
        ttl: grantForm.ttl,
        authorized_uuid: grantForm.authorizedUserId,
        resources: {},
        patterns: {},
        meta: Object.keys(grantForm.meta).length > 0 ? grantForm.meta : undefined,
      };

      // Convert form arrays to resource objects
      if (grantForm.channels.length > 0) {
        grantRequest.resources!.channels = {};
        grantForm.channels.forEach(channel => {
          if (channel.name) {
            grantRequest.resources!.channels![channel.name] = channel.permissions;
          }
        });
      }

      if (grantForm.channelGroups.length > 0) {
        grantRequest.resources!.groups = {};
        grantForm.channelGroups.forEach(group => {
          if (group.name) {
            grantRequest.resources!.groups![group.name] = group.permissions;
          }
        });
      }

      if (grantForm.uuids.length > 0) {
        grantRequest.resources!.uuids = {};
        grantForm.uuids.forEach(uuid => {
          if (uuid.name) {
            grantRequest.resources!.uuids![uuid.name] = uuid.permissions;
          }
        });
      }

      // Convert pattern arrays to pattern objects
      if (grantForm.channelPatterns.length > 0) {
        grantRequest.patterns!.channels = {};
        grantForm.channelPatterns.forEach(pattern => {
          if (pattern.pattern) {
            grantRequest.patterns!.channels![pattern.pattern] = pattern.permissions;
          }
        });
      }

      if (grantForm.channelGroupPatterns.length > 0) {
        grantRequest.patterns!.groups = {};
        grantForm.channelGroupPatterns.forEach(pattern => {
          if (pattern.pattern) {
            grantRequest.patterns!.groups![pattern.pattern] = pattern.permissions;
          }
        });
      }

      if (grantForm.uuidPatterns.length > 0) {
        grantRequest.patterns!.uuids = {};
        grantForm.uuidPatterns.forEach(pattern => {
          if (pattern.pattern) {
            grantRequest.patterns!.uuids![pattern.pattern] = pattern.permissions;
          }
        });
      }

      
      // Generate the curl command for manual execution
      const curlCommand = await generateGrantTokenCurl(
        currentSettings.credentials.subscribeKey,
        currentSettings.credentials.publishKey,
        currentSecretKey,
        grantRequest
      );
      
      
      // Store the curl command for display in the UI
      setGrantTokenCurl(curlCommand);
      
      // Show success message with instructions
      toast({
        title: 'Curl command generated',
        description: 'Run the curl command above to grant the token',
        duration: 8000,
      });
      
      // Don't close the dialog so user can see and copy the curl command
      
    } catch (error) {
      toast({
        title: 'Grant token failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsGranting(false);
    }
  }, [pubnub, grantForm, toast]);










  if (!mounted) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">

      {/* Configuration Warning */}
      {!secretKey && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800">Secret Key Required</h3>
          </div>
          <p className="text-sm text-orange-700 mt-1">
            To use Access Manager features, please configure your secret key in the main settings.
          </p>
        </div>
      )}

      {/* Demo Keys Warning */}
      {pubnubReady && 
       appSettings.credentials.publishKey && 
       appSettings.credentials.subscribeKey && 
       (appSettings.credentials.publishKey === 'demo' || appSettings.credentials.subscribeKey === 'demo') && (
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

      {/* Grant Curl Command Display */}
      {grantTokenCurl && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-800">Run this curl command to grant the token</h3>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(grantTokenCurl, 'Curl command')}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setGrantTokenCurl('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <pre className="bg-white p-3 rounded border border-green-200 overflow-x-auto text-sm">
            {grantTokenCurl}
          </pre>
          <p className="text-sm text-green-700 mt-2">
            After running the command, the token will be created in your PubNub Access Manager.
          </p>
        </div>
      )}

      {/* Revoke Curl Command Display */}
      {revokeTokenCurl && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Run this curl command to revoke the token</h3>
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
          <pre className="bg-white p-3 rounded border border-red-200 overflow-x-auto text-sm">
            {revokeTokenCurl}
          </pre>
          <p className="text-sm text-red-700 mt-2">
            After running the command, the token will be permanently revoked.
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
                      curlCommand={grantTokenCurl}
                      onCreateAnother={() => {
                        setGrantTokenCurl('');
                        setGrantForm(DEFAULT_GRANT_FORM);
                        toast({
                          title: 'Ready for new token',
                          description: 'Form has been reset. Configure permissions for your next token.',
                        });
                      }}
                      onCancel={() => {
                        setCreateTokenExpanded(false);
                        setGrantTokenCurl('');
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