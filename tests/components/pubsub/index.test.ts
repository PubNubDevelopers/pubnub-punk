// Unit tests for PubSub component exports
import { describe, it, expect } from 'vitest';

describe('PubSub Index Exports', () => {
  it('should export PubSubPage component', async () => {
    const { PubSubPage } = await import('../../../src/components/pubsub');
    expect(PubSubPage).toBeDefined();
    expect(typeof PubSubPage).toBe('function');
  });

  it('should export types', async () => {
    const {
      FIELD_DEFINITIONS,
      CURRENT_CONFIG_VERSION,
      CONFIG_MIGRATIONS
    } = await import('../../../src/components/pubsub');
    
    expect(FIELD_DEFINITIONS).toBeDefined();
    expect(CURRENT_CONFIG_VERSION).toBe(1);
    expect(CONFIG_MIGRATIONS).toBeDefined();
  });

  it('should export utility functions', async () => {
    const {
      getNestedValue,
      setNestedValue,
      deepMerge,
      stateToPageSettings,
      migrateConfig,
      createDefaultPageSettings,
      isValidChannelName,
      parseChannels,
      generateFilterExpression,
      isValidFilter,
      createDefaultFilter,
      formatMessagePayload,
      isValidJSON,
      isValidTTL,
      isValidHeartbeat,
      generateUniqueId,
      debounce
    } = await import('../../../src/components/pubsub');
    
    // Test that key utilities are exported
    expect(typeof getNestedValue).toBe('function');
    expect(typeof setNestedValue).toBe('function');
    expect(typeof deepMerge).toBe('function');
    expect(typeof stateToPageSettings).toBe('function');
    expect(typeof migrateConfig).toBe('function');
    expect(typeof createDefaultPageSettings).toBe('function');
    expect(typeof isValidChannelName).toBe('function');
    expect(typeof parseChannels).toBe('function');
    expect(typeof generateFilterExpression).toBe('function');
    expect(typeof isValidFilter).toBe('function');
    expect(typeof createDefaultFilter).toBe('function');
    expect(typeof formatMessagePayload).toBe('function');
    expect(typeof isValidJSON).toBe('function');
    expect(typeof isValidTTL).toBe('function');
    expect(typeof isValidHeartbeat).toBe('function');
    expect(typeof generateUniqueId).toBe('function');
    expect(typeof debounce).toBe('function');
  });
});