import React, { useState, useMemo, useId } from 'react';
import { Send, Copy, Edit, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { PublishFormData, PublishStatus } from './types';

interface QuickPublishPanelProps {
  publishData: PublishFormData;
  publishStatus: PublishStatus;
  isSubscribed: boolean;
  onPublishDataChange: (field: string, value: any) => void;
  onPublish: () => Promise<void> | void;
  onAfterPublish?: () => void;
}

export function QuickPublishPanel({
  publishData,
  publishStatus,
  isSubscribed,
  onPublishDataChange,
  onPublish,
  onAfterPublish,
}: QuickPublishPanelProps) {
  const { toast } = useToast();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const trimmedChannel = publishData.channel?.trim() || '';
  const trimmedMessage = publishData.message?.trim() || '';
  const publishAssistiveId = useId();
  const statusMessageId = useId();

  const publishDisabledReason = useMemo(() => {
    if (!isSubscribed) {
      return 'Connect to channels before publishing.';
    }
    if (!trimmedChannel) {
      return 'Add a channel before publishing.';
    }
    if (!trimmedMessage) {
      return 'Add a message before publishing.';
    }
    return null;
  }, [isSubscribed, trimmedChannel, trimmedMessage]);

  const statusIndicator = useMemo(() => {
    if (!publishStatus.isVisible) return null;

    const isSuccess = publishStatus.isSuccess;
    const Icon = isSuccess ? CheckCircle2 : AlertCircle;
    const text = isSuccess
      ? `timetoken=${publishStatus.timetoken}`
      : 'Publish Error';

    return (
      <div
        className="flex items-center space-x-2"
        role="status"
        aria-live="polite"
        id={statusMessageId}
      >
        <Icon
          className={`h-4 w-4 ${
            isSuccess ? 'text-green-500' : 'text-red-500'
          } ${publishStatus.isFlashing ? 'animate-pulse' : ''}`}
        />
        <span className="text-xs text-gray-600 font-mono">{text}</span>
      </div>
    );
  }, [publishStatus]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: 'The text has been copied to your clipboard.',
    });
  };

  const validateBeforePublish = () => {
    const channel = trimmedChannel;
    if (!channel) {
      toast({
        title: 'Channel required',
        description: 'Specify at least one channel before publishing.',
        variant: 'destructive',
      });
      return false;
    }

    const message = trimmedMessage;
    if (!message) {
      toast({
        title: 'Message required',
        description: 'Add a message payload before publishing.',
        variant: 'destructive',
      });
      return false;
    }

    if (message.startsWith('{') || message.startsWith('[')) {
      try {
        JSON.parse(message);
      } catch (error) {
        toast({
          title: 'Invalid JSON',
          description:
            'Message appears to be JSON but is not valid. Please fix or send a plain string.',
          variant: 'destructive',
        });
        return false;
      }
    }

    const meta = publishData.meta?.trim();
    if (meta) {
      try {
        JSON.parse(meta);
      } catch (error) {
        toast({
          title: 'Invalid Metadata',
          description: 'Metadata must be valid JSON when provided.',
          variant: 'destructive',
        });
        return false;
      }
    }

    const ttl = publishData.ttl?.trim();
    if (ttl) {
      const ttlValue = Number(ttl);
      if (!Number.isFinite(ttlValue) || ttlValue < 0) {
        toast({
          title: 'Invalid TTL',
          description: 'TTL must be a positive number of hours.',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handlePublishClick = async () => {
    if (!validateBeforePublish()) return;

    await onPublish();
    onAfterPublish?.();
  };

  const openEditor = () => setIsEditorOpen(true);
  const closeEditor = () => setIsEditorOpen(false);

  const formatMessage = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(publishData.message), null, 2);
      onPublishDataChange('message', formatted);
    } catch {
      toast({
        title: 'Invalid JSON',
        description: 'Could not format message as JSON',
        variant: 'destructive',
      });
    }
  };

  const publishDescribedBy = publishDisabledReason
    ? publishAssistiveId
    : publishStatus.isVisible
    ? statusMessageId
    : undefined;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Send className="h-5 w-5 mr-2 text-red-600" />
              Quick Publish
            </CardTitle>
            {statusIndicator}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-publish-channel">Channel</Label>
            <div className="flex gap-2">
              <Input
                id="quick-publish-channel"
                value={publishData.channel}
                onChange={(e) =>
                  onPublishDataChange('channel', e.target.value)
                }
                placeholder="hello_world"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(publishData.channel)}
                aria-label="Copy channel name"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <span className="sr-only">
              Current publish channel value is {publishData.channel || 'empty'}.
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-publish-message">Message</Label>
            <Textarea
              id="quick-publish-message"
              value={publishData.message}
              onChange={(e) => onPublishDataChange('message', e.target.value)}
              placeholder='{"text": "Hello, World!"}'
              className="font-mono"
              rows={4}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openEditor}
                className="flex items-center gap-1"
              >
                <Edit className="h-4 w-4" />
                Advanced options
              </Button>
            </div>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      className="bg-red-600 hover:bg-red-700"
                      onClick={handlePublishClick}
                      disabled={Boolean(publishDisabledReason)}
                      aria-describedby={publishDescribedBy}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Publish
                    </Button>
                  </span>
                </TooltipTrigger>
                {publishDisabledReason && (
                  <TooltipContent>
                    {publishDisabledReason}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {publishDisabledReason && (
              <span id={publishAssistiveId} className="sr-only">
                Publish disabled: {publishDisabledReason}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl space-y-6">
          <DialogHeader>
            <DialogTitle>Advanced Publish Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-publish-editor-message">Message (JSON)</Label>
              <Textarea
                id="quick-publish-editor-message"
                value={publishData.message}
                onChange={(e) => onPublishDataChange('message', e.target.value)}
                placeholder='{"text": "Hello, World!"}'
                className="font-mono"
                rows={8}
              />
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={formatMessage}>
                  Format JSON
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={publishData.storeInHistory}
                  onCheckedChange={(checked) =>
                    onPublishDataChange('storeInHistory', checked)
                  }
                />
                <Label className="text-sm">Store in History</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={publishData.sendByPost}
                  onCheckedChange={(checked) =>
                    onPublishDataChange('sendByPost', checked)
                  }
                />
                <Label className="text-sm">Send by POST</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quick-publish-editor-type">
                  Custom Message Type
                </Label>
                <Input
                  id="quick-publish-editor-type"
                  value={publishData.customMessageType}
                  onChange={(e) =>
                    onPublishDataChange('customMessageType', e.target.value)
                  }
                  placeholder="text-message"
                />
              </div>
              <div>
                <Label htmlFor="quick-publish-editor-ttl">TTL (Hours)</Label>
                <Input
                  id="quick-publish-editor-ttl"
                  value={publishData.ttl}
                  onChange={(e) => onPublishDataChange('ttl', e.target.value)}
                  placeholder="24"
                  type="number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-publish-editor-meta">Metadata (JSON)</Label>
              <Textarea
                id="quick-publish-editor-meta"
                value={publishData.meta}
                onChange={(e) => onPublishDataChange('meta', e.target.value)}
                placeholder='{"source": "dev-tools", "priority": "high"}'
                className="font-mono"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-publish-editor-authtoken">
                PAM Auth Token (Optional)
              </Label>
              <Input
                id="quick-publish-editor-authtoken"
                value={publishData.authToken}
                onChange={(e) => onPublishDataChange('authToken', e.target.value)}
                placeholder="Enter PAM token for this publish operation"
                type="password"
              />
              <p className="text-xs text-gray-500">
                If Access Manager (PAM) is enabled, provide an auth token with publish permissions for this channel.
              </p>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditor}>
              Close
            </Button>
            <Button onClick={closeEditor}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
