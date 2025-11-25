export interface ErrorDetails {
  title: string;
  description: string;
}

export const parsePublishError = (error: any): ErrorDetails => {
  console.log('PubNub Error Details:', error);

  let title = 'Publish Failed';
  let description = 'Failed to publish message';

  try {
    // Extract error message from various possible locations
    const errorMessage = error?.message ||
                        error?.error?.message ||
                        error?.statusText ||
                        error?.error_message ||
                        error?.payload?.error ||
                        error?.payload?.message ||
                        '';

    const rawErrorStatus = error?.status || error?.statusCode || error?.error?.status;

    // Helper function to format status value (handle objects, numbers, strings)
    const formatStatus = (status: any): string => {
      if (!status) return '';
      if (typeof status === 'number' || typeof status === 'string') {
        return String(status);
      }
      if (typeof status === 'object') {
        // Extract useful info from status object
        const statusCode = status.statusCode || status.code || status.status;
        const statusMessage = status.message || status.statusText || status.error || status.errorMessage;

        // Only use statusMessage if it's a string and not a boolean/useless value
        const hasValidMessage = statusMessage &&
                               typeof statusMessage === 'string' &&
                               statusMessage !== 'true' &&
                               statusMessage !== 'false';

        if (statusCode && hasValidMessage) {
          return `${statusCode} - ${statusMessage}`;
        } else if (statusCode) {
          return String(statusCode);
        } else if (hasValidMessage) {
          return String(statusMessage);
        }
        // Fallback to JSON for complex objects
        try {
          return JSON.stringify(status);
        } catch {
          return 'Unknown status';
        }
      }
      return String(status);
    };

    const errorStatus = typeof rawErrorStatus === 'number' ? rawErrorStatus : 0;
    const formattedStatus = formatStatus(rawErrorStatus);

    if (errorMessage.includes('Invalid key') || errorMessage.includes('invalid key')) {
      title = 'Invalid Publish Key';
      description = 'The publish key is invalid or doesn\'t exist. Please check your PubNub credentials in Settings.';
    } else if (errorMessage.includes('Forbidden') || errorStatus === 403) {
      title = 'Access Forbidden';
      description = 'Publishing to this channel is not allowed. This typically means Access Manager (PAM) is enabled and you need a valid auth token.';
      if (errorMessage && !errorMessage.includes('REST API request processing error')) {
        description += `\n\nDetails: ${errorMessage}`;
      }
    } else if (errorMessage.includes('Bad Request') || errorStatus === 400) {
      title = 'Bad Request';
      description = 'The request was malformed. Check your message format, channel name, and other parameters.';
      if (errorMessage && !errorMessage.includes('REST API request processing error')) {
        description += `\n\nDetails: ${errorMessage}`;
      }
    } else if (errorMessage.includes('Unauthorized') || errorStatus === 401) {
      title = 'Unauthorized';
      description = 'Authentication failed. Your publish key may be invalid or expired.';
      if (errorMessage && !errorMessage.includes('REST API request processing error')) {
        description += `\n\nDetails: ${errorMessage}`;
      }
    } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
      title = 'Request Timeout';
      description = 'The publish request timed out. Check your internet connection and try again.';
    } else if (errorMessage.includes('Network Error') || errorMessage.includes('network')) {
      title = 'Network Error';
      description = 'Network connectivity issue. Check your internet connection and try again.';
    } else if (errorMessage && !errorMessage.includes('REST API request processing error')) {
      title = 'Publish Failed';
      description = errorMessage;
      // Only append status if it provides additional useful info (not just the code)
      if (formattedStatus && formattedStatus.includes('-')) {
        description += ` (Status: ${formattedStatus})`;
      }
    } else if (errorStatus) {
      // Fallback when we only have a status code
      title = 'Publish Failed';
      description = `Request failed with status code ${errorStatus}`;
    }

    if (errorStatus === 403 || errorMessage.includes('Invalid key')) {
      description += '\n\nSuggestions:\n• Verify your publish key in Settings\n• Check if your keyset has publish permissions\n• Ensure Access Manager (PAM) is configured correctly (or set a PAM token in Settings)';
    } else if (errorStatus >= 500) {
      description += '\n\nThis appears to be a temporary server issue. Please try again in a few moments.';
    }

  } catch (parseError) {
    console.error('Error parsing PubNub error:', parseError);
    description = `Failed to publish message: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
  }

  return { title, description };
};