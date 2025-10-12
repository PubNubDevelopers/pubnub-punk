export interface ErrorDetails {
  title: string;
  description: string;
}

export const parsePublishError = (error: any): ErrorDetails => {
  console.log('PubNub Error Details:', error);
  
  let title = 'Publish Failed';
  let description = 'Failed to publish message';
  
  try {
    const errorMessage = error?.message || error?.error?.message || error?.statusText || '';
    const errorStatus = error?.status || error?.statusCode || error?.error?.status || 0;
    
    if (errorMessage.includes('Invalid key') || errorMessage.includes('invalid key')) {
      title = 'Invalid Publish Key';
      description = 'The publish key is invalid or doesn\'t exist. Please check your PubNub credentials in Settings.';
    } else if (errorMessage.includes('Forbidden') || errorStatus === 403) {
      title = 'Access Forbidden';
      description = 'Publishing to this channel is not allowed. Check your Access Manager (PAM) settings or verify your publish key has the correct permissions.';
    } else if (errorMessage.includes('Bad Request') || errorStatus === 400) {
      title = 'Bad Request';
      description = 'The request was malformed. Check your message format, channel name, and other parameters.';
    } else if (errorMessage.includes('Unauthorized') || errorStatus === 401) {
      title = 'Unauthorized';
      description = 'Authentication failed. Your publish key may be invalid or expired.';
    } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
      title = 'Request Timeout';
      description = 'The publish request timed out. Check your internet connection and try again.';
    } else if (errorMessage.includes('Network Error') || errorMessage.includes('network')) {
      title = 'Network Error';
      description = 'Network connectivity issue. Check your internet connection and try again.';
    } else if (errorMessage) {
      title = 'Publish Failed';
      description = `${errorMessage}${errorStatus ? ` (Status: ${errorStatus})` : ''}`;
    }
    
    if (errorStatus === 403 || errorMessage.includes('Invalid key')) {
      description += '\n\nSuggestions:\n• Verify your publish key in Settings\n• Check if your keyset has publish permissions\n• Ensure Access Manager (PAM) is configured correctly';
    } else if (errorStatus >= 500) {
      description += '\n\nThis appears to be a temporary server issue. Please try again in a few moments.';
    }
    
  } catch (parseError) {
    console.error('Error parsing PubNub error:', parseError);
    description = `Failed to publish message: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
  }
  
  return { title, description };
};