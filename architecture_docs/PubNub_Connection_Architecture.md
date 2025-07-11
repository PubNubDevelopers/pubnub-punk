# PubNub Connection Architecture

## Overview

This document describes the PubNub connection management architecture used in the PubNub Ultimate Ninja Kit. The system uses a **hybrid approach** that distinguishes between stateless operations (publish, history, etc.) and stateful operations (subscribe).

## Architecture Philosophy

### Centralized for Stateless Operations ✅
- **Publish messages**
- **Fetch message history**
- **Channel group management**
- **File operations**
- **Access Manager (PAM) operations**
- **Presence here-now/where-now queries**

### Local for Stateful Operations ✅
- **Subscribe to channels/channel groups**
- **Maintain active subscriptions**
- **Handle real-time message callbacks**

## Implementation Details

### Centralized Connection Hook (`usePubNub`)

**File**: `/src/hooks/usePubNub.ts`

**Purpose**: Provides a centralized PubNub instance for stateless operations. Multiple pages can share the same connection instance based on configuration.

**Features**:
- Connection management with automatic reconnection
- Settings-aware instance creation
- Instance registry for reuse across pages
- Connection validation
- Error handling and reporting

**Usage**:
```typescript
const { pubnub, isReady, isConnected, connectionError } = usePubNub({
  instanceId: 'my-page',
  userId: 'my-user',
  onConnectionError: (error) => console.error(error)
});

// Use for stateless operations
const result = await pubnub.publish({ channel: 'test', message: 'hello' });
```

### Local Subscription Management

**Purpose**: Each page that needs to subscribe to channels manages its own subscriptions locally.

**Rationale**: 
- Subscriptions are long-lived and stateful
- Each page has different callback requirements
- Avoids complex callback routing and state management
- Provides better isolation and error handling

**Implementation Pattern**:
```typescript
// In component (e.g., pubsub.tsx)
const [localSubscription, setLocalSubscription] = useState<any>(null);

// Subscribe
const subscription = pubnub.channel(['channel1']).subscription({
  receivePresenceEvents: true
});

subscription.onMessage = (messageEvent) => {
  // Handle message locally
  setMessages(prev => [...prev, messageEvent]);
};

subscription.subscribe();
setLocalSubscription(subscription);

// Cleanup
useEffect(() => {
  return () => {
    if (localSubscription) {
      localSubscription.unsubscribe();
    }
  };
}, [localSubscription]);
```

## File Structure

```
src/
├── hooks/
│   └── usePubNub.ts              # Centralized connection hook (stateless)
├── lib/
│   └── instance-registry.ts      # Instance management for reuse
├── pages/
│   ├── pubsub.tsx               # Example: local subscription management
│   ├── channel-groups.tsx       # Example: uses centralized hook only
│   └── file-sharing.tsx         # Example: uses centralized hook only
└── contexts/
    └── pubnub-context.tsx       # Global context for settings
```

## Usage Guidelines

### For Stateless Operations
Use the centralized `usePubNub` hook:

```typescript
import { usePubNub } from '@/hooks/usePubNub';

const MyComponent = () => {
  const { pubnub, isReady } = usePubNub({
    instanceId: 'my-component'
  });

  const handlePublish = async () => {
    if (pubnub && isReady) {
      await pubnub.publish({ channel: 'test', message: 'hello' });
    }
  };
};
```

### For Stateful Operations (Subscriptions)
Manage subscriptions locally within the component:

```typescript
import { usePubNub } from '@/hooks/usePubNub';

const MySubscriptionComponent = () => {
  const { pubnub, isReady } = usePubNub({ instanceId: 'my-component' });
  const [subscription, setSubscription] = useState(null);
  const [messages, setMessages] = useState([]);

  const handleSubscribe = () => {
    if (pubnub && isReady) {
      const sub = pubnub.channel(['my-channel']).subscription();
      
      sub.onMessage = (msg) => {
        setMessages(prev => [...prev, msg]);
      };
      
      sub.subscribe();
      setSubscription(sub);
    }
  };

  const handleUnsubscribe = () => {
    if (subscription) {
      subscription.unsubscribe();
      setSubscription(null);
    }
  };

  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [subscription]);
};
```

## Benefits of This Approach

### ✅ Advantages

1. **Simplicity**: Each page manages its own subscription state
2. **Isolation**: No complex callback routing between components
3. **Reusability**: Centralized connection for common operations
4. **Flexibility**: Pages can implement custom subscription logic
5. **Debugging**: Easier to trace subscription issues to specific pages
6. **Performance**: No unnecessary subscription state management overhead

### ⚠️ Considerations

1. **Code Duplication**: Each page needs to implement subscription boilerplate
2. **Learning Curve**: Developers need to understand the hybrid approach
3. **Instance Management**: Multiple pages create multiple subscription instances

## Migration Guide

### From Centralized Subscription Management

If you previously used centralized subscription management:

**Before** (centralized):
```typescript
const { subscribe, addListener, unsubscribe } = usePubNub({ subscriptionManager: true });
const subId = subscribe({ channels: ['test'] });
addListener(subId, 'message', callback);
```

**After** (local):
```typescript
const { pubnub } = usePubNub();
const subscription = pubnub.channel(['test']).subscription();
subscription.onMessage = callback;
subscription.subscribe();
```

## Testing

### Unit Tests
- Test centralized connection management
- Test local subscription lifecycle
- Test error handling and cleanup

### Integration Tests
- Test message publishing through centralized hook
- Test subscription message reception in local management
- Test settings changes and reconnection

## Best Practices

1. **Always use the centralized hook** for stateless operations
2. **Manage subscriptions locally** within components that need them
3. **Implement proper cleanup** in useEffect hooks
4. **Handle connection errors** gracefully
5. **Test both connection and subscription scenarios**

## Future Considerations

- Monitor for subscription boilerplate patterns that could be abstracted
- Consider custom hooks for common subscription patterns
- Evaluate performance implications of multiple subscription instances
- Consider subscription pooling for high-frequency use cases

---

**Last Updated**: 2025-07-08
**Architecture Version**: 2.0 (Hybrid Approach)