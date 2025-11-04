import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { usePubNub } from '@/hooks/usePubNub';
import { usePubNubContext, usePubNubConnectionStatus } from '@/contexts/pubnub-context';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Zap, Users, Clock, Globe } from 'lucide-react';

export default function TestConnectionPage() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [multiInstanceTest, setMultiInstanceTest] = useState<any[]>([]);

  // Test the main hook
  const mainInstance = usePubNub({
    instanceId: 'test-main',
    userId: 'test-main-user',
    onConnectionError: (error) => {
      console.log('Main instance error:', error);
    },
    onConnectionSuccess: () => {
      console.log('Main instance connected');
    }
  });

  // Test multiple instances
  const secondInstance = usePubNub({
    instanceId: 'test-secondary', 
    userId: 'test-secondary-user'
  });

  const thirdInstance = usePubNub({
    instanceId: 'test-tertiary',
    userId: 'test-tertiary-user'
  });

  // Use context
  const context = usePubNubContext();
  const connectionStatus = usePubNubConnectionStatus();

  const runConnectionTests = async () => {
    setIsRunningTests(true);
    const results: any[] = [];

    try {
      // Test 1: Main instance connection
      results.push({
        test: 'Main Instance Connection',
        status: mainInstance.isConnected ? 'pass' : 'fail',
        details: mainInstance.connectionError || 'Connection successful',
        timestamp: new Date().toISOString()
      });

      // Test 2: Time API call
      if (mainInstance.pubnub) {
        try {
          const timeResult = await mainInstance.pubnub.time();
          results.push({
            test: 'Time API Call',
            status: 'pass',
            details: `Server time: ${timeResult.timetoken}`,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          results.push({
            test: 'Time API Call',
            status: 'fail',
            details: error instanceof Error ? error.message : 'Time API failed',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Test 3: Multiple instances
      const instances = [mainInstance, secondInstance, thirdInstance];
      const connectedInstances = instances.filter(inst => inst.isConnected).length;
      results.push({
        test: 'Multiple Instances',
        status: connectedInstances >= 2 ? 'pass' : 'warn',
        details: `${connectedInstances}/3 instances connected`,
        timestamp: new Date().toISOString()
      });

      // Test 4: Context integration
      results.push({
        test: 'Context Integration',
        status: context.isGloballyConnected ? 'pass' : 'fail',
        details: context.globalConnectionError || 'Context connected successfully',
        timestamp: new Date().toISOString()
      });

      // Test 5: Settings validation
      const hasCredentials = context.settings.credentials.publishKey && context.settings.credentials.subscribeKey;
      results.push({
        test: 'Settings Validation',
        status: hasCredentials ? 'pass' : 'fail',
        details: hasCredentials ? 'Valid credentials found' : 'Missing required credentials',
        timestamp: new Date().toISOString()
      });

      setTestResults(results);
      
      toast({
        title: 'Connection Tests Complete',
        description: `${results.filter(r => r.status === 'pass').length}/${results.length} tests passed`,
      });

    } catch (error) {
      toast({
        title: 'Test Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const testMultipleInstances = () => {
    const instances = [
      { name: 'Main', instance: mainInstance },
      { name: 'Secondary', instance: secondInstance },
      { name: 'Tertiary', instance: thirdInstance },
      { name: 'Context Default', instance: { isConnected: context.isGloballyConnected, connectionError: context.globalConnectionError } }
    ];

    setMultiInstanceTest(
      instances.map(({ name, instance }) => ({
        name,
        connected: instance.isConnected,
        error: instance.connectionError,
        ready: 'isReady' in instance ? instance.isReady : true
      }))
    );
  };

  useEffect(() => {
    testMultipleInstances();
  }, [mainInstance.isConnected, secondInstance.isConnected, thirdInstance.isConnected, context.isGloballyConnected]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (connected: boolean, error?: string | null) => {
    if (connected) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Connected</Badge>;
    }
    if (error) {
      return <Badge variant="destructive">Error</Badge>;
    }
    return <Badge variant="secondary">Disconnected</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Test PubNub Connection</h1>
          <p className="text-gray-600">Test the centralized PubNub connection management system</p>
        </div>
        <Button 
          onClick={runConnectionTests} 
          disabled={isRunningTests}
          className="flex items-center gap-2"
        >
          {isRunningTests ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {isRunningTests ? 'Running Tests...' : 'Run Connection Tests'}
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="instances">Instances</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
          <TabsTrigger value="settings">Settings Info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {getStatusBadge(context.isGloballyConnected, context.globalConnectionError)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Default instance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Instances</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {connectionStatus.connected}/{connectionStatus.total}
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected/Total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Test Instances</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {multiInstanceTest.filter(i => i.connected).length}/4
                </div>
                <p className="text-xs text-muted-foreground">
                  Test instances active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connection Errors</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {connectionStatus.errors.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active errors
                </p>
              </CardContent>
            </Card>
          </div>

          {connectionStatus.errors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Connection Errors:</strong>
                <ul className="list-disc list-inside mt-2">
                  {connectionStatus.errors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Instance Status
              </CardTitle>
              <CardDescription>
                Status of all PubNub instances managed by the centralized system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {multiInstanceTest.map((instance, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium">{instance.name} Instance</div>
                      {getStatusBadge(instance.connected, instance.error)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {instance.error || (instance.connected ? 'Connected' : 'Not connected')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                Results from connection and functionality tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Click "Run Connection Tests" to see test results
                </div>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium">{result.test}</div>
                          <div className="text-sm text-gray-500">{result.details}</div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Current Settings
              </CardTitle>
              <CardDescription>
                PubNub configuration being used by the connection system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Credentials</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Publish Key:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.credentials.publishKey ? 
                          `${context.settings.credentials.publishKey.substring(0, 12)}...` : 
                          'Not set'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Subscribe Key:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.credentials.subscribeKey ? 
                          `${context.settings.credentials.subscribeKey.substring(0, 12)}...` : 
                          'Not set'
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">User ID:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.credentials.userId || 'Not set'}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Environment</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Origin:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.environment.origin === 'custom' ? 
                          context.settings.environment.customOrigin : 
                          context.settings.environment.origin
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">SSL:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.environment.ssl ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Log Verbosity:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.environment.logVerbosity}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Heartbeat Interval:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.environment.heartbeatInterval}s
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Event Engine:</span>
                      <div className="font-mono bg-gray-100 p-1 rounded">
                        {context.settings.environment.enableEventEngine ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
