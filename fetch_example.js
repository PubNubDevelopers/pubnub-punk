/**
 * PubNub Message History Retrieval Library
 * 
 * Extracted from the PubNub Developer Toolbox Channel Browser
 * This code handles fetching messages from PubNub Persistence (History) with various time range strategies
 */

// Time Range Strategy Constants
const TRS_NONE = 0;      // No time filtering - get most recent messages
const TRS_AT = 1;        // Get message at specific timetoken
const TRS_TT = 2;        // Get messages in timetoken range
const TRS_DT = 3;        // Get messages in date/time range

/**
 * Configuration object for message retrieval
 * @typedef {Object} MessageRetrievalConfig
 * @property {string} channel - The PubNub channel name
 * @property {number} timeRangeStrategy - Strategy for time filtering (TRS_NONE, TRS_AT, TRS_TT, TRS_DT)
 * @property {number} maxRows - Maximum number of messages to retrieve
 * @property {string} [atTimetoken] - Specific timetoken to retrieve (for TRS_AT)
 * @property {string} [startTimetoken] - Start timetoken for range (for TRS_TT)
 * @property {string} [endTimetoken] - End timetoken for range (for TRS_TT)
 * @property {string} [startDate] - Start date in YYYY-MM-DD format (for TRS_DT)
 * @property {string} [endDate] - End date in YYYY-MM-DD format (for TRS_DT)
 * @property {string} [startTime] - Start time in HH:MM format (for TRS_DT)
 * @property {string} [endTime] - End time in HH:MM format (for TRS_DT)
 */

/**
 * Builds PubNub fetchMessages parameters based on configuration
 * @param {MessageRetrievalConfig} config - Configuration object
 * @returns {Object} Parameters for PubNub fetchMessages API
 */
function buildFetchParams(config) {
  const { channel, timeRangeStrategy, atTimetoken, startTimetoken, endTimetoken, startDate, endDate, startTime, endTime } = config;
  
  let params = {};
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

/**
 * Converts date and time strings to PubNub timetoken format
 * @param {string} theDate - Date in YYYY-MM-DD format
 * @param {string} theTime - Time in HH:MM format
 * @returns {string|null} Formatted datetime string or null if invalid
 */
function createDatetimeString(theDate, theTime) {
  if (!theDate || !theTime) return null;

  const theDateTime = new Date(`${theDate} ${theTime}`);
  
  // Format as 'yyyy-MM-dd HH:mm:ss:SSS0000' - PubNub expected format
  const year = theDateTime.getFullYear();
  const month = String(theDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(theDateTime.getDate()).padStart(2, '0');
  const hour = String(theDateTime.getHours()).padStart(2, '0');
  const minute = String(theDateTime.getMinutes()).padStart(2, '0');
  const second = String(theDateTime.getSeconds()).padStart(2, '0');
  const millisecond = String(theDateTime.getMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}:${millisecond}0000`;
}

/**
 * Retrieves messages from PubNub with pagination support
 * @param {Object} pubnub - Initialized PubNub instance
 * @param {MessageRetrievalConfig} config - Configuration object
 * @param {Function} [onProgress] - Optional progress callback
 * @returns {Promise<Array>} Array of messages
 */
async function retrieveMessages(pubnub, config, onProgress) {
  const { channel, maxRows = 1000 } = config;
  let params = buildFetchParams(config);
  let more = true;
  let results = [];
  let totalRecords = 0;

  const limit = maxRows < 1000 ? maxRows : 1000;

  do {
    try {
      const result = await pubnub.fetchMessages(params);
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
 * Deletes a specific message from PubNub
 * @param {Object} pubnub - Initialized PubNub instance
 * @param {string} channel - Channel name
 * @param {string} timetoken - Message timetoken to delete
 * @returns {Promise<Object>} Delete operation result
 */
async function deleteMessage(pubnub, channel, timetoken) {
  try {
    const result = await pubnub.deleteMessages({
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

/**
 * Subtracts 1 from a timetoken string (used for message deletion)
 * @param {string} tt - Timetoken string
 * @param {string} tail - Internal parameter for recursion
 * @returns {string} Decremented timetoken
 */
function ttMinus1(tt, tail = '') {
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
 * Increments a timetoken by 1
 * @param {string} tt - Timetoken string
 * @returns {string} Incremented timetoken
 */
function ttIncrement(tt) {
  const tt16 = parseInt(tt.substring(0, 16));
  const ttnano = parseInt(tt.substring(16));

  if (ttnano === 9) {
    return (tt16 + 1) + "0";
  }
  else {
    return tt16 + "" + (ttnano + 1);
  }
}

/**
 * Converts a timetoken to human-readable date
 * @param {string} timetoken - PubNub timetoken
 * @returns {Object} Object containing GMT and local date strings
 */
function convertTimetoken(timetoken) {
  if (!timetoken) return { gmt: null, local: null };

  // Extract unix timestamp (first 10 digits)
  let tt = timetoken.length <= 13 ? timetoken : timetoken.substring(0, 10);
  const theDate = new Date(parseInt(tt) * 1000);
  
  return {
    gmt: theDate.toGMTString(),
    local: theDate.toLocaleString() + " (local)"
  };
}

/**
 * Generates a message fingerprint for deduplication
 * @param {*} input - Message content (any type)
 * @returns {string} 8-character hexadecimal fingerprint
 */
function generateMfp(input) {
  let msg = typeof input !== "string" ? JSON.stringify(input) : input;
  let mfp = new Uint32Array(1);
  let walk = 0;
  let len = msg.length;
  
  while (len-- > 0) {
    mfp[0] = (mfp[0] << 5) - mfp[0] + msg.charCodeAt(walk++);
  }
  
  return mfp[0].toString(16).padStart(8, '0');
}

/**
 * Calculates the size of a message in KB
 * @param {*} message - Message content
 * @returns {string} Size in KB (formatted to 2 decimal places)
 */
function messageSize(message) {
  const str = typeof message !== "string" ? JSON.stringify(message) : message;
  const byteSize = encodeURIComponent(str).replace(/%../g, 'x').length;
  const kilobytes = byteSize / 1024;
  return kilobytes.toFixed(2);
}

/**
 * Calculates transaction count based on message size
 * @param {number} kbSize - Size in KB
 * @returns {number} Number of transactions
 */
function calcTxCount(kbSize) {
  return Math.trunc((kbSize / 2) + 1);
}

/**
 * Truncates a string to specified length
 * @param {string} data - String to truncate
 * @param {number} size - Maximum length
 * @param {boolean} noDots - Whether to omit ellipsis
 * @returns {string} Truncated string
 */
function truncate(data, size, noDots = false) {
  if (data == null || data === "" || data.length <= size) {
    return data;
  }
  
  return data.substring(0, size) + (noDots ? "" : "...");
}

// Export functions for use in other modules
module.exports = {
  // Constants
  TRS_NONE,
  TRS_AT,
  TRS_TT,
  TRS_DT,
  
  // Core functions
  buildFetchParams,
  createDatetimeString,
  retrieveMessages,
  deleteMessage,
  
  // Utility functions
  ttMinus1,
  ttIncrement,
  convertTimetoken,
  generateMfp,
  messageSize,
  calcTxCount,
  truncate
};