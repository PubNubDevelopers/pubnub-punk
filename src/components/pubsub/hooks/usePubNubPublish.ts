import { useState, useCallback } from 'react';
import { PublishFormData, PublishStatus, PublishAttemptResult } from '../types';
import { parsePublishError } from '../shared/ErrorParser';

interface UsePubNubPublishOptions {
  pubnub: any | null;
  onSuccess?: (timetoken: string) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
  onAttemptComplete?: (result: PublishAttemptResult) => void;
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
    retryDelay = 1000,
    onAttemptComplete,
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
    attemptNumber: number = 1,
    startedAt: number = Date.now()
  ): Promise<void> => {
    if (!pubnub) {
      const err = new Error('PubNub instance not available');
      setError(err.message);
      onError?.(err);
      onAttemptComplete?.({
        success: false,
        timetoken: undefined,
        error: err.message,
        attempts: attemptNumber,
        durationMs: Date.now() - startedAt,
        startedAt,
        publishData,
      });
      throw err;
    }

    if (!publishData.channel || !publishData.channel.trim()) {
      const err = new Error('Channel name is required');
      setError(err.message);
      onError?.(err);
      onAttemptComplete?.({
        success: false,
        timetoken: undefined,
        error: err.message,
        attempts: attemptNumber,
        durationMs: Date.now() - startedAt,
        startedAt,
        publishData,
      });
      throw err;
    }

    if (!publishData.message || !publishData.message.trim()) {
      const err = new Error('Message content is required');
      setError(err.message);
      onError?.(err);
      onAttemptComplete?.({
        success: false,
        timetoken: undefined,
        error: err.message,
        attempts: attemptNumber,
        durationMs: Date.now() - startedAt,
        startedAt,
        publishData,
      });
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

      // Handle PAM auth token if provided
      let originalToken: string | null = null;
      const hasAuthToken = publishData.authToken && publishData.authToken.trim();

      if (hasAuthToken) {
        // Store original token to restore later
        originalToken = pubnub.getToken ? pubnub.getToken() : null;

        // Set the auth token for this publish operation
        if (pubnub.setToken) {
          console.log('Setting PAM token for publish operation');
          pubnub.setToken(publishData.authToken.trim());
        } else {
          console.warn('PubNub SDK version does not support setToken(). The auth token cannot be applied for this publish.');
        }
      }

      let publishResult;
      try {
        publishResult = await pubnub.publish(publishParams);
        console.log('Publish successful:', publishResult);
      } finally {
        // Always restore original token, whether publish succeeded or failed
        if (hasAuthToken && pubnub.setToken) {
          if (originalToken) {
            pubnub.setToken(originalToken);
          } else {
            // Clear token if there wasn't one before
            pubnub.setToken(null);
          }
        }
      }

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
      onAttemptComplete?.({
        success: true,
        timetoken: publishResult.timetoken,
        error: undefined,
        attempts: attemptNumber,
        durationMs: Date.now() - startedAt,
        startedAt,
        publishData,
      });
      
    } catch (err) {
      console.error(`Publish attempt ${attemptNumber} failed:`, err);
      
      // Check if we should retry
      if (attemptNumber < maxRetries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Exponential backoff for next retry
        const nextDelay = retryDelay * Math.pow(2, attemptNumber - 1);
        return attemptPublish(publishData, attemptNumber + 1, startedAt);
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
      onAttemptComplete?.({
        success: false,
        timetoken: undefined,
        error: description,
        attempts: attemptNumber,
        durationMs: Date.now() - startedAt,
        startedAt,
        publishData,
      });
      throw err;
    }
  }, [pubnub, maxRetries, retryDelay, onSuccess, onError, onAttemptComplete]);

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
