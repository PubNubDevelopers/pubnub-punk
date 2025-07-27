import React, { useState, useCallback } from 'react';
import { Send, Settings, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { PublishFormData, PublishStatus, QuickPublishPanelProps } from './types';
import { isValidJSON, isValidTTL } from './utils';

export function QuickPublishPanel({
  publishData,
  publishStatus,
  onPublishDataChange,
  onFormatMessage,
  onPublish,
  className
}: QuickPublishPanelProps) {
  const { toast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle input changes with proper type safety
  const handleFieldChange = useCallback((field: keyof PublishFormData, value: string | boolean) => {
    onPublishDataChange(prev => ({
      ...prev,
      [field]: value
    }));
  }, [onPublishDataChange]);

  // Handle JSON formatting with validation
  const handleFormatMessage = useCallback(() => {
    try {
      const parsed = JSON.parse(publishData.message);
      const formatted = JSON.stringify(parsed, null, 2);
      handleFieldChange('message', formatted);
      
      toast({
        title: "Message Formatted",
        description: "JSON message has been formatted successfully.",
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "The message contains invalid JSON syntax.",
        variant: "destructive",
      });
    }
  }, [publishData.message, handleFieldChange, toast]);

  // Handle publish with validation
  const handlePublish = useCallback(async () => {
    // Validate required fields
    if (!publishData.channel.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!publishData.message.trim()) {
      toast({
        title: "Validation Error", 
        description: "Message content is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate JSON if the message looks like JSON
    const messageText = publishData.message.trim();
    if ((messageText.startsWith('{') && messageText.endsWith('}')) || 
        (messageText.startsWith('[') && messageText.endsWith(']'))) {
      if (!isValidJSON(messageText)) {
        toast({
          title: "Invalid JSON",
          description: "The message contains invalid JSON syntax. Please format or fix the JSON.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate TTL if provided
    if (publishData.ttl && !isValidTTL(publishData.ttl)) {
      toast({
        title: "Invalid TTL",
        description: "TTL must be a positive number.",
        variant: "destructive",
      });
      return;
    }

    // Validate meta if provided
    if (publishData.meta && !isValidJSON(publishData.meta)) {
      toast({
        title: "Invalid Meta",
        description: "Meta field must contain valid JSON.",
        variant: "destructive",
      });
      return;
    }

    // Call the publish handler
    await onPublish();
  }, [publishData, onPublish, toast]);

  // Get status icon and color
  const getStatusIcon = () => {
    if (!publishStatus.isVisible) {
      return <Send className="h-4 w-4" />;
    }
    
    if (!publishStatus.isSuccess) {
      // Publishing or error state
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      // Success state
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getButtonVariant = () => {
    if (!publishStatus.isVisible) return 'default';
    return publishStatus.isSuccess ? 'default' : 'destructive';
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-[#c71929]" />
            QUICK PUBLISH
          </div>
          <Button
            onClick={handlePublish}
            disabled={!publishData.channel.trim() || !publishData.message.trim()}
            variant={getButtonVariant()}
            className="bg-[#c71929] hover:bg-[#a61521] text-white"
            size="sm"
          >
            {getStatusIcon()}
            PUBLISH
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel Input */}
        <div className="space-y-2">
          <Label htmlFor="publish-channel" className="text-sm font-medium">
            Channel
          </Label>
          <Input
            id="publish-channel"
            value={publishData.channel}
            onChange={(e) => handleFieldChange('channel', e.target.value)}
            placeholder="Enter channel name..."
            className="font-mono"
          />
        </div>

        {/* Message Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="publish-message" className="text-sm font-medium">
              Message
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFormatMessage}
            >
              Format JSON
            </Button>
          </div>
          <Textarea
            id="publish-message"
            value={publishData.message}
            onChange={(e) => handleFieldChange('message', e.target.value)}
            placeholder="Enter your message..."
            className="font-mono min-h-[100px] resize-vertical"
            rows={4}
          />
        </div>

        {/* Basic Options and Advanced Toggle - Inline Layout to Match Wireframe */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="store-in-history"
                checked={publishData.storeInHistory}
                onCheckedChange={(checked) => handleFieldChange('storeInHistory', checked)}
              />
              <Label htmlFor="store-in-history" className="text-sm font-medium">
                Store in History
              </Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="send-by-post"
                checked={publishData.sendByPost}
                onCheckedChange={(checked) => handleFieldChange('sendByPost', checked)}
              />
              <Label htmlFor="send-by-post" className="text-sm font-medium">
                Send by POST
              </Label>
            </div>
          </div>

          {/* Advanced/Basic Toggle - Inline with toggles */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="text-sm font-normal p-0 h-auto">
                {showAdvanced ? 'Basic ▲' : 'Advanced ▼'}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Advanced Options Collapsible Content */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleContent className="pt-4">
            {/* 2-Column Grid Layout to Match Wireframe */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Custom Message Type */}
                <div className="space-y-2">
                  <Label htmlFor="custom-message-type" className="text-sm font-medium">
                    Custom Message Type
                  </Label>
                  <Input
                    id="custom-message-type"
                    value={publishData.customMessageType}
                    onChange={(e) => handleFieldChange('customMessageType', e.target.value)}
                    placeholder="text-message"
                    className="font-mono"
                  />
                </div>

                {/* TTL */}
                <div className="space-y-2">
                  <Label htmlFor="publish-ttl" className="text-sm font-medium">
                    TTL (Hours)
                  </Label>
                  <Input
                    id="publish-ttl"
                    type="number"
                    value={publishData.ttl}
                    onChange={(e) => handleFieldChange('ttl', e.target.value)}
                    placeholder=""
                    className="font-mono"
                    min="0"
                    step="1"
                  />
                </div>
              </div>

              {/* Right Column - Metadata */}
              <div className="space-y-2">
                <Label htmlFor="publish-meta" className="text-sm font-medium">
                  Metadata (JSON)
                </Label>
                <Textarea
                  id="publish-meta"
                  value={publishData.meta}
                  onChange={(e) => handleFieldChange('meta', e.target.value)}
                  placeholder='{"source": "dev-tools", "priority": "high"}'
                  className="font-mono"
                  rows={6}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>


        {/* Status Message */}
        {publishStatus.isVisible && publishStatus.isSuccess && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
            <div className="font-medium">Message published successfully!</div>
            {publishStatus.timetoken && (
              <div className="text-xs mt-1 font-mono">
                Timetoken: {publishStatus.timetoken}
              </div>
            )}
          </div>
        )}
        
        {publishStatus.isVisible && !publishStatus.isSuccess && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Failed to publish message. Please check your configuration and try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
}