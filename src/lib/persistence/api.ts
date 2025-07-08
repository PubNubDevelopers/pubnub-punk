import { HistoryMessage, ChannelHistory, PubNubHistoryParams, FetchProgress } from '@/types/persistence';

/**
 * PubNub Message Persistence API Service
 */
export class PersistenceAPI {
  private pubnub: any;

  constructor(pubnub: any) {
    this.pubnub = pubnub;
  }

  /**
   * Fetch message history for a single channel with pagination
   */
  async fetchChannelHistory(
    channel: string,
    count: number,
    startTimetoken?: string,
    endTimetoken?: string,
    params: Partial<PubNubHistoryParams> = {},
    onProgress?: (progress: Partial<FetchProgress>) => void
  ): Promise<ChannelHistory> {
    const allMessages: HistoryMessage[] = [];
    let currentStart = startTimetoken || undefined;
    let currentEnd = endTimetoken || undefined;
    let remainingCount = count;
    let iterationCount = 0;
    const maxIterations = Math.ceil(count / 100); // Safety limit
    const seen = new Set<string>(); // Deduplication set

    console.log(`Fetching ${count} messages for channel ${channel}`);

    // Update progress for current channel
    onProgress?.({
      currentChannel: channel,
      currentBatch: 0,
      totalBatches: Math.ceil(count / 100)
    });

    // Iterate through multiple API calls if count > 100
    while (remainingCount > 0 && iterationCount < maxIterations) {
      const batchSize = Math.min(remainingCount, 100); // API limit is 100
      
      const fetchParams: any = {
        channels: [channel],
        count: batchSize,
        includeTimetoken: params.includeTimetoken ?? true,
        includeMeta: params.includeMeta ?? false,
        includeUUID: params.includeUUID ?? true,
        includeMessageActions: params.includeMessageActions ?? false,
        reverse: params.reverse ?? false,
      };

      // Add time range if specified
      if (currentStart) {
        fetchParams.start = currentStart;
      }
      if (currentEnd) {
        fetchParams.end = currentEnd;
      }
      
      console.log(`Iteration ${iterationCount + 1}: Fetching ${batchSize} messages with params:`, fetchParams);

      const result = await this.pubnub.fetchMessages(fetchParams);
      console.log(`Iteration ${iterationCount + 1} result:`, result);

      const channelData = result.channels && result.channels[channel] ? result.channels[channel] : [];
      
      console.log(`Iteration ${iterationCount + 1}: Received ${channelData.length} messages`);
      
      // If no messages returned, stop immediately
      if (channelData.length === 0) {
        console.log('No messages returned from API, stopping iteration');
        break;
      }

      let batchMessages: HistoryMessage[] = channelData.map((item: any) => ({
        message: item.message,
        timetoken: item.timetoken,
        uuid: item.uuid,
        meta: item.meta,
        messageType: item.messageType,
        channel: channel,
      }));

      console.log(`Iteration ${iterationCount + 1}: Mapped ${batchMessages.length} messages to internal format`);

      // Add messages to collection with deduplication
      for (const msg of batchMessages) {
        if (!seen.has(msg.timetoken)) {
          allMessages.push(msg);
          seen.add(msg.timetoken);
        }
      }
      
      remainingCount = count - allMessages.length;
      iterationCount++;
      
      console.log(`After iteration ${iterationCount}: allMessages.length = ${allMessages.length}, remainingCount = ${remainingCount}`);
      
      // Update progress
      onProgress?.({
        current: allMessages.length,
        currentBatch: iterationCount,
        totalBatches: Math.ceil(count / 100)
      });
      
      // Apply the fix: strict, parameter-aware pagination
      if (batchMessages.length > 0) {
        const oldest = BigInt(batchMessages[0].timetoken);
        const newest = BigInt(batchMessages[batchMessages.length - 1].timetoken);
        
        if (!startTimetoken && !endTimetoken) {
          // No boundaries: walk back in time
          currentEnd = (oldest - 1n).toString();
          console.log(`No boundaries mode: Setting end to ${currentEnd} for next batch`);
        } else if (startTimetoken && !endTimetoken) {
          // Start only: walk forward
          currentStart = (newest + 1n).toString();
          console.log(`Start-only mode: Setting start to ${currentStart} for next batch`);
        } else if (!startTimetoken && endTimetoken) {
          // End only: walk back
          currentEnd = (oldest - 1n).toString();
          console.log(`End-only mode: Setting end to ${currentEnd} for next batch`);
        } else {
          // Bounded window: walk forward until we hit or pass the user's end
          const nextStart = newest + 1n;
          if (nextStart >= BigInt(endTimetoken)) {
            console.log(`Range complete: nextStart ${nextStart} >= endTimetoken ${endTimetoken}`);
            break;
          }
          currentStart = nextStart.toString();
          console.log(`Bounded mode: Setting start to ${currentStart} for next batch`);
        }
      } else {
        console.log('No messages in batch, stopping iteration');
        break;
      }

      // If we got fewer messages than requested, we've reached the end
      if (batchMessages.length < batchSize) {
        console.log(`Received ${batchMessages.length} messages, requested ${batchSize}. End of available messages.`);
        break;
      }
      
      // Small delay between requests to be respectful to the API
      if (remainingCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Completed fetching for ${channel}. Total messages: ${allMessages.length}`);

    return {
      channel,
      messages: allMessages,
      totalMessages: allMessages.length,
      startTimetoken: allMessages.length > 0 ? allMessages[allMessages.length - 1].timetoken : undefined,
      endTimetoken: allMessages.length > 0 ? allMessages[0].timetoken : undefined,
    };
  }

  /**
   * Fetch message history for multiple channels
   */
  async fetchHistory(
    channels: string[],
    count: number,
    startTimetoken?: string,
    endTimetoken?: string,
    params: Partial<PubNubHistoryParams> = {},
    onProgress?: (progress: FetchProgress) => void
  ): Promise<ChannelHistory[]> {
    const results: ChannelHistory[] = [];
    
    for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
      const channel = channels[channelIndex];
      
      try {
        const channelHistory = await this.fetchChannelHistory(
          channel,
          count,
          startTimetoken,
          endTimetoken,
          params,
          (progress) => {
            onProgress?.({
              current: (results.reduce((sum, r) => sum + r.totalMessages, 0)) + (progress.current || 0),
              total: count * channels.length,
              currentChannel: channel,
              currentBatch: progress.currentBatch || 0,
              totalBatches: (progress.totalBatches || 0) * channels.length
            });
          }
        );
        
        results.push(channelHistory);
        
      } catch (error) {
        console.error(`Error fetching history for channel ${channel}:`, error);
        
        // Still add empty entry to show the channel was attempted
        results.push({
          channel,
          messages: [],
          totalMessages: 0,
        });
      }
    }
    
    return results;
  }

  /**
   * Get message counts for channels
   */
  async getMessageCounts(channels: string[]): Promise<Record<string, number>> {
    // Use a recent timetoken as baseline (last 30 days)
    const thirtyDaysAgo = (Date.now() - 30 * 24 * 60 * 60 * 1000) * 10000; // Convert to PubNub timetoken
    
    const result = await this.pubnub.messageCounts({
      channels: channels,
      channelTimetokens: [thirtyDaysAgo.toString()]
    });

    return result.channels || {};
  }

  /**
   * Delete a specific message from history
   */
  async deleteMessage(channel: string, timetoken: string): Promise<void> {
    // For deleting a specific message, we use the timetoken as both start and end
    // with start being timetoken-1 (exclusive) and end being timetoken (inclusive)
    const startTT = (BigInt(timetoken) - BigInt(1)).toString();
    
    await this.pubnub.deleteMessages({
      channel: channel,
      start: startTT,
      end: timetoken
    });
  }
}