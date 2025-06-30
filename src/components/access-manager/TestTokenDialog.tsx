import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';

interface TestTokenDialogProps {
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
}

export function TestTokenDialog({
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
}: TestTokenDialogProps) {
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