import { HistoryMessage, ChannelHistory, PubNubHistoryParams, FetchProgress } from '@/types/persistence';
import { MessageCountsResponse } from '@/types/pubnub';

// Time Range Strategy Constants (from fetch_example.js)
const TRS_NONE = 0;
const TRS_AT = 1;
const TRS_TT = 2;
const TRS_DT = 3;

// Create datetime string for PubNub
function createDatetimeString(theDate: string, theTime: string): string | null {
  if (!theDate || !theTime) return null;
  
  const theDateTime = new Date(`${theDate} ${theTime}`);
  
  const year = theDateTime.getFullYear();
  const month = String(theDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(theDateTime.getDate()).padStart(2, '0');
  const hour = String(theDateTime.getHours()).padStart(2, '0');
  const minute = String(theDateTime.getMinutes()).padStart(2, '0');
  const second = String(theDateTime.getSeconds()).padStart(2, '0');
  const millisecond = String(theDateTime.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}:${millisecond}0000`;
}

// Build fetch parameters using the new methodology
function buildFetchParams(config: any) {
  const { channel, timeRangeStrategy, atTimetoken, startTimetoken, endTimetoken, startDate, endDate, startTime, endTime } = config;
  
  let params: any = {};
  params.channels = [channel];

  if (timeRangeStrategy === TRS_NONE) {
    params.start = null;
  }
  else if (timeRangeStrategy === TRS_AT) {
    params.end = atTimetoken;
    params.count = 1;
  }
  else if (timeRangeStrategy === TRS_TT) {
    params.start = startTimetoken;
    params.end = endTimetoken;
  }
  else if (timeRangeStrategy === TRS_DT) {
    params.end = createDatetimeString(endDate, endTime);
    params.start = createDatetimeString(startDate, startTime);
  }
  
  return params;
}

// Subtracts 1 from a timetoken string (used for message deletion)
function ttMinus1(tt: string, tail: string = ''): string {
  if (!tt) {
    throw new Error('No timetoken provided');
  }
  if (Object.prototype.toString.call(tt) !== '[object String]') {
    throw new Error('Invalid timetoken');
  }
  if (tt.length === 0) {
    throw new Error('Timetoken was either 0 or empty');
  }

  tail = tt[tt.length - 1] + tail;
  tt = tt.substring(0, tt.length - 1);

  if (Number(tail) === 0) {
    return ttMinus1(tt, tail);
  } else {
    return tt + (Number(tail) - 1);
  }
}

/**
 * PubNub Message Persistence API Service
 * Updated to use the new SDK methodology from fetch_example.js
 */
export class PersistenceAPI {
  private pubnub: any;

  constructor(pubnub: any) {
    this.pubnub = pubnub;
  }

  /**
   * Fetch message history for a single channel with pagination
   * Updated to use the new SDK methodology from fetch_example.js
   */
  async fetchChannelHistory(
    channel: string,
    count: number,
    startTimetoken?: string,
    endTimetoken?: string,
    params: Partial<PubNubHistoryParams> = {},
    onProgress?: (progress: Partial<FetchProgress>) => void
  ): Promise<ChannelHistory> {
    const maxRows = count;
    
    // Determine time range strategy
    let timeRangeStrategy = TRS_NONE;
    if (startTimetoken || endTimetoken) {
      timeRangeStrategy = TRS_TT;
    }

    const config = {
      channel,
      timeRangeStrategy,
      maxRows,
      startTimetoken: startTimetoken || undefined,
      endTimetoken: endTimetoken || undefined,
    };

    console.log(`Fetching ${count} messages for channel ${channel} using new methodology`);

    // Update progress for current channel
    onProgress?.({
      currentChannel: channel,
      currentBatch: 0,
      totalBatches: Math.ceil(count / 100)
    });

    // Use the new retrieveMessages function methodology
    const results = await this.retrieveMessagesWithNewMethod(config, (current, total) => {
      onProgress?.({
        current,
        currentBatch: Math.ceil(current / 100),
        totalBatches: Math.ceil(total / 100)
      });
    });

    // Convert results to HistoryMessage format
    const allMessages: HistoryMessage[] = results.map((msg: any) => ({
      message: msg.message,
      timetoken: msg.timetoken,
      uuid: msg.uuid,
      meta: msg.meta,
      messageType: msg.messageType,
      channel: channel,
    }));

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
   * New retrieveMessages method using the fetch_example.js methodology
   */
  private async retrieveMessagesWithNewMethod(config: any, onProgress?: (current: number, total: number) => void): Promise<any[]> {
    const { channel, maxRows = 1000 } = config;
    let params = buildFetchParams(config);
    let more = true;
    let results: any[] = [];
    let totalRecords = 0;

    const limit = maxRows < 1000 ? maxRows : 1000;

    do {
      try {
        const result = await this.pubnub.fetchMessages(params);
        const resultCount = result.channels[channel].length;
        totalRecords += resultCount;

        if (result != null && totalRecords > 0) {
          // Concatenate new results to the beginning to maintain chronological order
          results = result.channels[channel].concat(results);
          
          // Continue if we haven't hit our limit and got a full batch (100 messages)
          more = totalRecords < limit && resultCount === 100;
          
          // Update start parameter for next iteration
          params.start = result.channels[channel][0].timetoken;
          
          // Call progress callback if provided
          if (onProgress) {
            onProgress(totalRecords, limit);
          }
        }
        else {
          more = false;
        }
      }
      catch (error) {
        console.error('Error retrieving messages:', error);
        throw error;
      }
    } while (more);

    return results;
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
  async getMessageCounts(
    channels: string[],
    options: { startTimetoken?: string; endTimetoken?: string } = {}
  ): Promise<Record<string, number>> {
    const sanitizeToken = (token?: string) => {
      const trimmed = token?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : undefined;
    };

    const startToken = sanitizeToken(options.startTimetoken);
    const endToken = sanitizeToken(options.endTimetoken);

    // Default baseline (last 30 days) when no start timetoken provided
    const defaultStartTimetoken = (
      (Date.now() - 30 * 24 * 60 * 60 * 1000) * 10000
    ).toString();

    const channelTokens = (token: string) => channels.map(() => token);

    const startRequest: Promise<MessageCountsResponse> = this.pubnub.messageCounts({
      channels,
      channelTimetokens: channelTokens(startToken ?? defaultStartTimetoken),
    });

    const endRequest: Promise<MessageCountsResponse | null> = endToken
      ? this.pubnub.messageCounts({
          channels,
          channelTimetokens: channelTokens(endToken),
        })
      : Promise.resolve<MessageCountsResponse | null>(null);

    const [startResponse, endResponse] = await Promise.all([startRequest, endRequest] as const);

    const counts: Record<string, number> = {};

    channels.forEach((channel) => {
      const startCount = startResponse.channels?.[channel] ?? 0;
      const endCount = endResponse ? endResponse.channels?.[channel] ?? 0 : 0;

      counts[channel] = endToken ? Math.max(0, startCount - endCount) : startCount;
    });

    return counts;
  }

  /**
   * Delete a specific message from history
   * Updated to use the new ttMinus1 methodology from fetch_example.js
   */
  async deleteMessage(channel: string, timetoken: string): Promise<void> {
    try {
      const result = await this.pubnub.deleteMessages({
        channel: channel,
        start: ttMinus1(timetoken),
        end: timetoken,
      });
      return result;
    }
    catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
}
