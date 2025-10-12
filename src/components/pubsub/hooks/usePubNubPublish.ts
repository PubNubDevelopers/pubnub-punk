import { useState, useCallback } from 'react';
import { PublishFormData, PublishStatus } from '../types';
import { parsePublishError } from '../shared/ErrorParser';

interface UsePubNubPublishOptions {
  pubnub: any | null;
  onSuccess?: (timetoken: string) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
}

interface UsePubNubPublishResult {
  publish: (data: PublishFormData) => Promise<boolean>;
  publishStatus: PublishStatus;
  isPublishing: boolean;
  error: string | null;
}

export function usePubNubPublish(options: UsePubNubPublishOptions): UsePubNubPublishResult {
  const {
    pubnub,
    onSuccess,
    onError,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const [publishStatus, setPublishStatus] = useState<PublishStatus>({
    isVisible: false,
    isSuccess: false,
    isFlashing: false
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attemptPublish = useCallback(async (
    publishData: PublishFormData, 
    attemptNumber: number = 1
  ): Promise<void> => {
    if (!pubnub) {
      const err = new Error('PubNub instance not available');
      setError(err.message);
      onError?.(err);
      throw err;
    }

    if (!publishData.channel || !publishData.channel.trim()) {
      const err = new Error('Channel name is required');
      setError(err.message);
      onError?.(err);
      throw err;
    }

    if (!publishData.message || !publishData.message.trim()) {
      const err = new Error('Message content is required');
      setError(err.message);
      onError?.(err);
      throw err;
    }

    // Parse and validate message
    let messagePayload: any;
    try {
      messagePayload = JSON.parse(publishData.message);
    } catch (e) {
      // If not valid JSON, send as string
      messagePayload = publishData.message;
    }

    // Parse and validate metadata if provided
    let metaPayload: any = undefined;
    if (publishData.meta && publishData.meta.trim()) {
      try {
        metaPayload = JSON.parse(publishData.meta);
      } catch (e) {
        const err = new Error('Metadata must be valid JSON');
        setError(err.message);
        onError?.(err);
        throw err;
      }
    }

    // Build publish parameters
    const publishParams: any = {
      channel: publishData.channel,
      message: messagePayload,
      storeInHistory: publishData.storeInHistory,
      sendByPost: publishData.sendByPost
    };

    if (publishData.ttl && publishData.ttl.trim()) {
      const ttlValue = parseInt(publishData.ttl);
      if (isNaN(ttlValue) || ttlValue < 0) {
        const err = new Error('TTL must be a positive number');
        setError(err.message);
        onError?.(err);
        throw err;
      }
      publishParams.ttl = ttlValue;
    }

    if (publishData.customMessageType && publishData.customMessageType.trim()) {
      publishParams.customMessageType = publishData.customMessageType;
    }

    if (metaPayload) {
      publishParams.meta = metaPayload;
    }

    try {
      console.log(`Publishing (attempt ${attemptNumber}/${maxRetries}):`, publishParams);
      
      const publishResult = await pubnub.publish(publishParams);
      
      console.log('Publish successful:', publishResult);
      
      // Success - update status
      setPublishStatus({
        isVisible: true,
        isSuccess: true,
        timetoken: publishResult.timetoken,
        isFlashing: true
      });
      
      setTimeout(() => {
        setPublishStatus(prev => ({ ...prev, isFlashing: false }));
      }, 500);
      
      setError(null);
      onSuccess?.(publishResult.timetoken);
      
    } catch (err) {
      console.error(`Publish attempt ${attemptNumber} failed:`, err);
      
      // Check if we should retry
      if (attemptNumber < maxRetries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Exponential backoff for next retry
        const nextDelay = retryDelay * Math.pow(2, attemptNumber - 1);
        return attemptPublish(publishData, attemptNumber + 1);
      }
      
      // All retries failed
      setPublishStatus({
        isVisible: true,
        isSuccess: false,
        isFlashing: true
      });
      
      setTimeout(() => {
        setPublishStatus(prev => ({ ...prev, isFlashing: false }));
      }, 500);
      
      const { description } = parsePublishError(err);
      setError(description);
      onError?.(err instanceof Error ? err : new Error(description));
      throw err;
    }
  }, [pubnub, maxRetries, retryDelay, onSuccess, onError]);

  const publish = useCallback(async (publishData: PublishFormData): Promise<boolean> => {
    setIsPublishing(true);
    try {
      await attemptPublish(publishData);
      return true;
    } catch (_error) {
      return false;
    } finally {
      setIsPublishing(false);
    }
  }, [attemptPublish]);

  return {
    publish,
    publishStatus,
    isPublishing,
    error
  };
}
