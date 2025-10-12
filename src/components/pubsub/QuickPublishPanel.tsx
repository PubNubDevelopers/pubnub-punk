import React, { useState } from 'react';
import { Send, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PublishFormData, PublishStatus } from './types';

interface QuickPublishPanelProps {
  publishData: PublishFormData;
  publishStatus: PublishStatus;
  onPublishDataChange: (field: string, value: any) => void;
  onPublish: () => void;
}

export function QuickPublishPanel({
  publishData,
  publishStatus,
  onPublishDataChange,
  onPublish
}: QuickPublishPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "The text has been copied to your clipboard.",
    });
  };

  const formatMessage = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(publishData.message), null, 2);
      onPublishDataChange('message', formatted);
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Could not format message as JSON",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Send className="h-5 w-5 mr-2 text-red-600" />
            QUICK PUBLISH
          </CardTitle>
          <div className="flex flex-col items-end space-y-2">
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={onPublish}
            >
              <Send className="h-4 w-4 mr-2" />
              PUBLISH
            </Button>
            
            {publishStatus.isVisible && (
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-full transition-colors duration-150 ${
                    publishStatus.isFlashing
                      ? publishStatus.isSuccess 
                        ? 'bg-green-500 animate-pulse' 
                        : 'bg-red-500 animate-pulse'
                      : publishStatus.isSuccess
                        ? 'bg-green-500'
                        : 'bg-red-500'
                  }`}
                />
                <span className="text-xs text-gray-600 font-mono">
                  {publishStatus.isSuccess 
                    ? `timetoken=${publishStatus.timetoken}`
                    : 'Publish Error'
                  }
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label>Channel</Label>
            <div className="flex space-x-2">
              <Input 
                value={publishData.channel}
                onChange={(e) => onPublishDataChange('channel', e.target.value)}
                placeholder="hello_world"
                className="flex-1"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(publishData.channel)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <div className="flex space-x-2">
              <Input 
                value={publishData.message}
                onChange={(e) => onPublishDataChange('message', e.target.value)}
                placeholder='{"text": "Hello, World!"}'
                className="flex-1 font-mono"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={formatMessage}
              >
                Format
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Switch 
              checked={publishData.storeInHistory}
              onCheckedChange={(checked) => onPublishDataChange('storeInHistory', checked)}
            />
            <Label className="text-sm">Store in History</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              checked={publishData.sendByPost}
              onCheckedChange={(checked) => onPublishDataChange('sendByPost', checked)}
            />
            <Label className="text-sm">Send by POST</Label>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Basic' : 'Advanced'}
            {showAdvanced ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
          </Button>
        </div>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Custom Message Type</Label>
                <Input 
                  value={publishData.customMessageType}
                  onChange={(e) => onPublishDataChange('customMessageType', e.target.value)}
                  placeholder="text-message"
                />
              </div>
              <div>
                <Label>TTL (Hours)</Label>
                <Input 
                  value={publishData.ttl}
                  onChange={(e) => onPublishDataChange('ttl', e.target.value)}
                  placeholder="24"
                  type="number"
                />
              </div>
            </div>
            <div>
              <Label>Metadata (JSON)</Label>
              <Textarea 
                value={publishData.meta}
                onChange={(e) => onPublishDataChange('meta', e.target.value)}
                placeholder='{"source": "dev-tools", "priority": "high"}'
                className="font-mono"
                rows={2}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}