/**
 * Utility functions for PubNub Message Persistence
 */

/**
 * Format timetoken for display
 */
export const formatTimetoken = (timetoken: string): string => {
  try {
    const timestamp = Math.floor(parseInt(timetoken) / 10000); // Convert to milliseconds
    return new Date(timestamp).toLocaleString();
  } catch {
    return timetoken;
  }
};

/**
 * Convert timetoken to datetime-local format for input (in selected timezone)
 */
export const timetokenToDatetimeLocal = (timetoken: string, selectedTimezone: string): string => {
  if (!timetoken || !selectedTimezone) return '';
  try {
    console.log('Converting timetoken to timestamp:', { timetoken, timezone: selectedTimezone });
    
    const timestamp = Math.floor(parseInt(timetoken) / 10000); // Convert to milliseconds
    if (isNaN(timestamp)) {
      console.error('Invalid timetoken:', timetoken);
      return '';
    }
    
    const utcDate = new Date(timestamp);
    console.log('UTC date:', utcDate);
    
    // Convert UTC date to selected timezone
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: selectedTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(utcDate);
    const formatted = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`;
    
    console.log('Formatted result:', formatted);
    return formatted;
  } catch (error) {
    console.error('Timetoken conversion error:', error);
    return '';
  }
};

/**
 * Convert datetime-local format to timetoken (treating input as selected timezone, converting to UTC)
 */
export const datetimeLocalToTimetoken = (datetimeLocal: string, selectedTimezone: string): string => {
  if (!datetimeLocal || !selectedTimezone) {
    console.log('Missing required params:', { datetimeLocal, selectedTimezone });
    return '';
  }
  
  try {
    console.log('Converting timestamp to timetoken:', { input: datetimeLocal, timezone: selectedTimezone });
    
    // BULLETPROOF APPROACH: Use the browser's built-in timezone conversion
    // Step 1: Parse the components
    const [datePart, timePart] = datetimeLocal.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second = 0] = timePart.split(':').map(Number);
    
    console.log('Parsed components:', { year, month, day, hour, minute, second });
    
    // Step 2: Create the date string in a format that includes timezone
    // Use the browser's Intl API to construct a proper date
    
    // Create a temporary date to work with
    const tempLocalDate = new Date(year, month - 1, day, hour, minute, second);
    console.log('Temp local date:', tempLocalDate.toISOString());
    
    // The key insight: we need to find what UTC time would display as our input time in the target timezone
    // We'll use binary search or direct calculation
    
    // Method: Use Intl.DateTimeFormat to format a known UTC time in the target timezone
    // Then find the UTC time that produces our desired target timezone display
    
    // Start with the local interpretation and adjust
    let utcCandidate = tempLocalDate.getTime();
    
    // Test what this UTC time looks like in the target timezone
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: selectedTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const targetDisplay = formatter.format(new Date(utcCandidate));
    const expectedDisplay = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;
    
    console.log('Target display:', targetDisplay);
    console.log('Expected display:', expectedDisplay);
    
    // If they don't match, we need to adjust
    if (targetDisplay !== expectedDisplay) {
      // Calculate the difference and adjust
      const displayedDate = new Date(targetDisplay.replace(' ', 'T'));
      const expectedDate = new Date(expectedDisplay.replace(' ', 'T'));
      const diff = expectedDate.getTime() - displayedDate.getTime();
      
      utcCandidate += diff;
      
      console.log('Applied correction of', diff / 1000 / 3600, 'hours');
    }
    
    console.log('Final UTC candidate:', new Date(utcCandidate).toISOString());
    
    // Verify our result
    const verification = formatter.format(new Date(utcCandidate));
    console.log('Verification - this UTC time displays as:', verification, 'in', selectedTimezone);
    
    // Convert to PubNub timetoken (microseconds * 10)
    const timetoken = (utcCandidate * 10000).toString();
    console.log('Generated timetoken:', timetoken);
    
    return timetoken;
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return '';
  }
};

/**
 * Copy text to clipboard with toast notification
 */
export const copyToClipboard = async (
  text: string, 
  description: string, 
  toast: (options: any) => void
): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${description} copied to clipboard`,
    });
  } catch (error) {
    toast({
      title: "Copy Failed",
      description: "Failed to copy to clipboard",
      variant: "destructive",
    });
  }
};
