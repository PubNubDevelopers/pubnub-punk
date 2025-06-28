# Mobile Push Developer Tools - Implementation Guide

## Overview
This document provides comprehensive information about the Mobile Push Notifications page implementation in the PubNub Developer Tools app. This page allows developers to test, debug, and manage mobile push notifications for both iOS (APNs) and Android (FCM) platforms.

## File Location
- **Main Component**: `src/pages/mobile-push.tsx`
- **Documentation**: `mobile_push.md` (this file)

## Architecture & Design Patterns

### Following Established Patterns
The mobile push page follows the same architectural patterns as other pages in the app:

1. **Config Management**: Uses `FIELD_DEFINITIONS` object for page settings schema
2. **PubNub SDK Integration**: 
   - Checks for mounted state and PubNub availability
   - Creates PubNub instance with user credentials from storage
   - Handles loading states during initialization
3. **Error Handling**: Comprehensive try-catch blocks with user-friendly toast notifications
4. **LocalStorage Persistence**: Stores device tokens and configurations locally
5. **Responsive Design**: Split-panel layout with sidebar and main content area

### UI Component Structure
```
MobilePushPage
├── Header (title, description, requirements note)
├── Main Layout (flex with gap)
│   ├── Left Panel (w-80, device & channel management)
│   │   ├── Device Tokens Card
│   │   └── Test Channels Card
│   └── Main Content (Tabs)
│       ├── Notification Builder
│       ├── Device Management  
│       └── Debug Monitor
```

## Key Features Implemented

### 1. Device Token Management
- **Add Device Dialog**: Platform selection (APNs/FCM), token input, alias, environment settings
- **Device List**: Visual representation with platform icons, channel counts, remove functionality
- **Persistent Storage**: Saves to `localStorage` key: `pubnub_mobile_push_devices`
- **Validation**: Prevents duplicate tokens, validates required fields

### 2. Push Notification Builder
- **Cross-Platform Support**: Targets iOS, Android, or both platforms
- **Platform-Specific Settings**:
  - **APNs**: Badge count, sound, environment (dev/prod), topic/bundle ID, collapse ID
  - **FCM**: Icon, tag, click action
- **Custom Data**: JSON editor for additional payload data
- **Payload Generation**: Creates proper `pn_apns` and `pn_fcm` formatted payloads
- **Copy Functionality**: Allows copying generated payload to clipboard

### 3. Device-Channel Association Management
- **Add Channels**: Associates device tokens with specific channels
- **Remove Channels**: Removes channel associations
- **List/Refresh**: Syncs with PubNub to get current channel associations
- **PubNub API Integration**: Uses `pubnub.push.addChannels()`, `removeChannels()`, `listChannels()`

### 4. Debug Monitor
- **Debug Channel Subscription**: Auto-subscribes to `[channel-name]-pndebug` channels
- **Real-time Monitoring**: Displays push delivery status and error messages
- **Message History**: Keeps last 50 debug messages with timestamps
- **Visual Indicators**: Shows active monitoring status with pulse animation

### 5. Test Channel Management
- **Channel Creation**: Add custom test channels for push notifications
- **Channel Selection**: Quick switching between test channels
- **Debug Integration**: One-click debug monitoring for selected channels

## Data Structures

### DeviceToken Interface
```typescript
interface DeviceToken {
  token: string;                    // Device registration token
  platform: 'apns' | 'fcm';       // Platform type
  environment?: 'development' | 'production'; // APNs environment
  topic?: string;                  // APNs bundle ID/topic
  channels: string[];              // Associated channels
  lastModified: string;            // ISO timestamp
  alias?: string;                  // Human-readable name
}
```

### NotificationPayload Interface
```typescript
interface NotificationPayload {
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  platform: 'apns' | 'fcm' | 'both';
  apns?: {
    collapseId?: string;
    expirationDate?: string;
    topic?: string;
    environment?: 'development' | 'production';
  };
  fcm?: {
    icon?: string;
    tag?: string;
    clickAction?: string;
  };
}
```

## PubNub API Integration

### Push Gateway Methods Used
1. **Add Channels to Device**:
   ```javascript
   // APNs
   await pubnub.push.addChannels({
     channels: [channel],
     device: deviceToken,
     pushGateway: 'apns2',
     environment: 'development' | 'production',
     topic: 'com.example.app'
   });
   
   // FCM
   await pubnub.push.addChannels({
     channels: [channel],
     device: deviceToken,
     pushGateway: 'gcm'
   });
   ```

2. **Remove Channels from Device**: Similar structure with `removeChannels()`
3. **List Device Channels**: Uses `listChannels()` to sync current state
4. **Publish Notifications**: Uses standard `pubnub.publish()` with platform-specific payloads

### Payload Format Examples
```javascript
// APNs Payload
{
  message: customData,
  pn_apns: {
    aps: {
      alert: { title: "Title", body: "Body" },
      badge: 1,
      sound: "default"
    },
    pn_push: [{
      targets: [{
        topic: "com.example.app",
        environment: "development"
      }],
      collapse_id: "group-id"
    }],
    ...customData
  }
}

// FCM Payload
{
  message: customData,
  pn_fcm: {
    notification: {
      title: "Title",
      body: "Body",
      icon: "ic_notification"
    },
    data: customData
  }
}
```

## Configuration Management

### Field Definitions
```typescript
const FIELD_DEFINITIONS = {
  'mobilePush.devices': { section: 'mobilePush', field: 'devices', type: 'array', default: [] },
  'mobilePush.selectedDevice': { section: 'mobilePush', field: 'selectedDevice', type: 'string', default: '' },
  'mobilePush.testChannels': { section: 'mobilePush', field: 'testChannels', type: 'array', default: ['push-test'] },
  'mobilePush.selectedChannel': { section: 'mobilePush', field: 'selectedChannel', type: 'string', default: 'push-test' },
} as const;
```

### Page Settings Structure
```javascript
{
  mobilePush: {
    devices: DeviceToken[],
    selectedDevice: string,
    testChannels: string[],
    selectedChannel: string
  },
  configForSaving: {
    devices: DeviceToken[],
    testChannels: string[],
    timestamp: string
  }
}
```

## State Management

### Key State Variables
- `devices`: Array of DeviceToken objects
- `selectedDevice`: Currently selected device token string
- `testChannels`: Array of test channel names
- `selectedChannel`: Currently selected channel for notifications
- `notification`: Current notification builder state
- `debugChannelSubscribed`: Currently monitored debug channel
- `debugMessages`: Array of received debug messages
- `loading`: Various loading states for async operations

### LocalStorage Keys
- `pubnub_mobile_push_devices`: Persisted device tokens

## Error Handling & User Feedback

### Toast Notifications
- Success: Device added/removed, channel operations, notifications sent
- Errors: API failures, validation errors, network issues
- Info: Debug channel subscriptions, operation status

### Validation Rules
- Device tokens: Required, no duplicates
- Channels: Non-empty strings
- Notifications: Title and body required
- APNs: Topic required for APNs2 configuration

## Debug Features

### Debug Channel Pattern
- Format: `[original-channel]-pndebug`
- Example: `push-test` → `push-test-pndebug`
- Purpose: Receive detailed push delivery status and error information

### Debug Message Structure
Messages contain delivery status, device targeting info, success/failure details, and error codes for troubleshooting.

## Known Issues & Limitations

### Icon Library Issue (RESOLVED)
- **Problem**: `Apple` and `Android` icons not available in `lucide-react`
- **Solution**: Replaced with `Smartphone` icon throughout
- **Files affected**: All icon references in mobile-push.tsx

### Current Limitations
1. **Manual Device Token Entry**: Users must manually obtain and paste device tokens
2. **No Bulk Operations**: Device management is one-at-a-time
3. **Debug Channel Limitation**: Can only monitor one debug channel at a time
4. **No Push History**: No persistent log of sent notifications

## Future Enhancement Ideas

### Immediate Improvements
1. **QR Code Scanner**: For easier device token input
2. **Bulk Device Import**: CSV/JSON file upload for multiple devices
3. **Push History**: Persistent log with replay capability
4. **Template System**: Save/load notification templates
5. **Scheduled Notifications**: Time-delayed push sending

### Advanced Features
1. **A/B Testing**: Send different notifications to device groups
2. **Analytics Integration**: Track delivery rates and engagement
3. **Rich Media**: Support for images, videos, interactive notifications
4. **Geofencing**: Location-based push triggers
5. **User Segmentation**: Group devices by criteria for targeted pushes

### Developer Experience
1. **Code Generation**: Generate native app integration code
2. **Webhook Integration**: Connect to external systems
3. **Testing Automation**: Scripted notification testing
4. **Performance Monitoring**: Track push latency and success rates

## Dependencies

### Required PubNub Features
- **Mobile Push Notifications Add-on**: Must be enabled in Admin Portal
- **APNs Configuration**: Valid certificates/auth keys uploaded
- **FCM Configuration**: Valid server keys configured

### UI Components Used
- Cards, Buttons, Inputs, Labels, Textareas from `/components/ui/`
- Dialog, Tabs, Tooltip, Select components
- Toast notifications for user feedback
- Lucide React icons (Smartphone, Send, Plus, etc.)

## Testing Considerations

### Manual Testing Checklist
1. **Device Management**: Add/remove APNs and FCM devices
2. **Channel Association**: Add/remove channels from devices
3. **Notification Building**: Test all platform-specific options
4. **Debug Monitoring**: Verify debug channel subscription and message display
5. **Error Handling**: Test invalid inputs, network failures
6. **Persistence**: Verify LocalStorage saves/loads correctly

### Integration Testing
1. **PubNub API**: Verify all push gateway methods work
2. **Platform Compatibility**: Test APNs dev/prod environments
3. **Payload Validation**: Ensure proper formatting for both platforms
4. **Debug Channel**: Confirm debug messages are received

## Code Quality Notes

### TypeScript Usage
- Comprehensive interfaces for all data structures
- Proper typing for PubNub SDK methods
- Type-safe state management

### React Best Practices
- Functional components with hooks
- Proper dependency arrays in useEffect
- Memoized computed values with useMemo
- Event handler optimization

### Performance Considerations
- LocalStorage operations are synchronous (minimal impact)
- Debug message array limited to 50 items
- Efficient re-renders with proper state structure

This documentation should provide sufficient context for future development, bug fixes, and feature enhancements to the Mobile Push Notifications page.