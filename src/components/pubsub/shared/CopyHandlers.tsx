import { copyToClipboard } from '../utils';
import type { MessageData, PresenceEvent } from '../types';

interface ToastFunction {
  (options: {
    title: string;
    description: string;
    variant?: 'default' | 'destructive';
  }): void;
}

export const copyAllMessages = async (messages: MessageData[], toast: ToastFunction): Promise<void> => {
  if (messages.length === 0) {
    toast({
      title: "No Messages",
      description: "No messages to copy",
      variant: "destructive",
    });
    return;
  }

  try {
    const rawMessages = messages.map(msg => ({
      channel: msg.channel,
      timetoken: msg.timetoken,
      publisher: msg.publisher || null,
      subscription: msg.subscription || null,
      messageType: msg.messageType || null,
      message: msg.message,
      meta: msg.userMetadata || null
    }));

    const fullText = JSON.stringify(rawMessages, null, 2);
    await copyToClipboard(fullText);
    
    toast({
      title: "Raw Messages Copied",
      description: `Successfully copied ${messages.length} raw message${messages.length !== 1 ? 's' : ''} to clipboard`,
    });
  } catch (error) {
    console.error('Failed to copy messages:', error);
    toast({
      title: "Copy Failed",
      description: "Failed to copy messages to clipboard",
      variant: "destructive",
    });
  }
};

export const copyAllPresenceEvents = async (presenceEvents: PresenceEvent[], toast: ToastFunction): Promise<void> => {
  if (presenceEvents.length === 0) {
    toast({
      title: "No Presence Events",
      description: "No presence events to copy",
      variant: "destructive",
    });
    return;
  }

  try {
    const rawPresenceEvents = presenceEvents.map(event => ({
      channel: event.channel,
      action: event.action,
      occupancy: event.occupancy,
      uuid: event.uuid,
      timestamp: event.timestamp,
      timetoken: event.timetoken
    }));

    const fullText = JSON.stringify(rawPresenceEvents, null, 2);
    await copyToClipboard(fullText);
    
    toast({
      title: "Raw Presence Events Copied",
      description: `Successfully copied ${presenceEvents.length} raw presence event${presenceEvents.length !== 1 ? 's' : ''} to clipboard`,
    });
  } catch (error) {
    console.error('Failed to copy presence events:', error);
    toast({
      title: "Copy Failed",
      description: "Failed to copy presence events to clipboard",
      variant: "destructive",
    });
  }
};