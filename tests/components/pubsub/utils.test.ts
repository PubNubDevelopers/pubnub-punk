// Unit tests for PubSub utility functions
import { describe, it, expect, beforeEach } from 'vitest';
import {
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
} from '../../../src/components/pubsub/utils';

import {
  PublishFormData,
  SubscribeFormData,
  UIState,
  FilterState,
  FilterConfig
} from '../../../src/components/pubsub/types';

describe('PubSub Utils', () => {
  describe('getNestedValue', () => {
    it('should get simple property values', () => {
      const obj = { name: 'test', age: 25 };
      expect(getNestedValue(obj, 'name')).toBe('test');
      expect(getNestedValue(obj, 'age')).toBe(25);
    });

    it('should get nested property values', () => {
      const obj = { user: { profile: { name: 'John' } } };
      expect(getNestedValue(obj, 'user.profile.name')).toBe('John');
    });

    it('should return undefined for non-existent paths', () => {
      const obj = { name: 'test' };
      expect(getNestedValue(obj, 'nonexistent')).toBeUndefined();
      expect(getNestedValue(obj, 'user.profile.name')).toBeUndefined();
    });

    it('should handle null/undefined objects', () => {
      expect(getNestedValue(null, 'name')).toBeUndefined();
      expect(getNestedValue(undefined, 'name')).toBeUndefined();
    });
  });

  describe('setNestedValue', () => {
    it('should set simple property values', () => {
      const obj: any = {};
      setNestedValue(obj, 'name', 'test');
      expect(obj.name).toBe('test');
    });

    it('should set nested property values', () => {
      const obj: any = {};
      setNestedValue(obj, 'user.profile.name', 'John');
      expect(obj.user.profile.name).toBe('John');
    });

    it('should overwrite existing values', () => {
      const obj = { user: { name: 'old' } };
      setNestedValue(obj, 'user.name', 'new');
      expect(obj.user.name).toBe('new');
    });
  });

  describe('deepMerge', () => {
    it('should merge simple objects', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should merge nested objects', () => {
      const target = { user: { name: 'John', age: 25 } };
      const source = { user: { age: 30, city: 'NYC' } };
      const result = deepMerge(target, source);
      
      expect(result).toEqual({ 
        user: { name: 'John', age: 30, city: 'NYC' } 
      });
    });

    it('should not mutate original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const result = deepMerge(target, source);
      
      expect(target).toEqual({ a: 1 });
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle arrays correctly', () => {
      const target = { items: [1, 2] };
      const source = { items: [3, 4] };
      const result = deepMerge(target, source);
      
      expect(result.items).toEqual([3, 4]);
    });
  });

  describe('stateToPageSettings', () => {
    it('should convert states to page settings', () => {
      const publishData: PublishFormData = {
        channel: 'test',
        message: '{}',
        storeInHistory: true,
        sendByPost: false,
        ttl: '',
        customMessageType: 'test',
        meta: ''
      };

      const subscribeData: SubscribeFormData = {
        channels: 'test',
        channelGroups: '',
        receivePresenceEvents: false,
        cursor: { timetoken: '', region: '' },
        withPresence: false,
        heartbeat: 300,
        restoreOnReconnect: true
      };

      const uiState: UIState = {
        showAdvanced: false,
        showFilters: false,
        showMessages: true,
        messagesHeight: 200,
        showRawMessageData: false
      };

      const filterState: FilterState = {
        logic: '&&',
        conditions: []
      };

      const result = stateToPageSettings(publishData, subscribeData, uiState, filterState);

      expect(result.publish).toEqual(publishData);
      expect(result.subscribe).toEqual(subscribeData);
      expect(result.ui).toEqual(uiState);
      expect(result.filters).toEqual(filterState);
      expect(result._version).toBe(1);
    });
  });

  describe('migrateConfig', () => {
    it('should migrate config without version to version 1', () => {
      const config = { test: 'value' };
      const result = migrateConfig(config);
      
      expect(result._version).toBe(1);
      expect(result.test).toBe('value');
    });

    it('should keep config at current version unchanged', () => {
      const config = { test: 'value', _version: 1 };
      const result = migrateConfig(config);
      
      expect(result).toEqual(config);
    });
  });

  describe('createDefaultPageSettings', () => {
    it('should create complete default settings', () => {
      const result = createDefaultPageSettings();

      expect(result._version).toBe(1);
      expect(result.publish).toBeDefined();
      expect(result.subscribe).toBeDefined();
      expect(result.ui).toBeDefined();
      expect(result.filters).toBeDefined();
    });

    it('should have correct default values', () => {
      const result = createDefaultPageSettings();

      expect(result.publish.channel).toBe('hello_world');
      expect(result.subscribe.heartbeat).toBe(300);
      expect(result.ui.showMessages).toBe(true);
      expect(result.filters.logic).toBe('&&');
    });

    it('should have cursor object', () => {
      const result = createDefaultPageSettings();
      
      expect(result.subscribe.cursor).toBeDefined();
      expect(result.subscribe.cursor.timetoken).toBe('');
      expect(result.subscribe.cursor.region).toBe('');
    });
  });

  describe('isValidChannelName', () => {
    it('should validate correct channel names', () => {
      expect(isValidChannelName('test-channel')).toBe(true);
      expect(isValidChannelName('channel123')).toBe(true);
      expect(isValidChannelName('my_channel')).toBe(true);
    });

    it('should reject invalid channel names', () => {
      expect(isValidChannelName('')).toBe(false);
      expect(isValidChannelName('  ')).toBe(false);
      expect(isValidChannelName('channel with spaces')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isValidChannelName(null as any)).toBe(false);
      expect(isValidChannelName(undefined as any)).toBe(false);
    });
  });

  describe('parseChannels', () => {
    it('should parse comma-separated channels', () => {
      expect(parseChannels('ch1,ch2,ch3')).toEqual(['ch1', 'ch2', 'ch3']);
      expect(parseChannels('ch1, ch2, ch3')).toEqual(['ch1', 'ch2', 'ch3']);
    });

    it('should handle empty and whitespace', () => {
      expect(parseChannels('')).toEqual([]);
      expect(parseChannels('  ')).toEqual([]);
      expect(parseChannels('ch1, , ch3')).toEqual(['ch1', 'ch3']);
    });

    it('should handle single channel', () => {
      expect(parseChannels('single')).toEqual(['single']);
    });
  });

  describe('generateFilterExpression', () => {
    it('should generate expression from filters', () => {
      const filters: FilterConfig[] = [
        { id: 1, target: 'message', field: 'type', operator: '==', value: 'alert', type: 'string' },
        { id: 2, target: 'message', field: 'priority', operator: '>', value: '5', type: 'number' }
      ];

      const result = generateFilterExpression(filters, '&&');
      expect(result).toBe('message.type == "alert" && message.priority > 5');
    });

    it('should handle empty filters', () => {
      expect(generateFilterExpression([], '&&')).toBe('No filters configured');
    });

    it('should handle invalid filters', () => {
      const filters: FilterConfig[] = [
        { id: 1, target: '', field: '', operator: '==', value: '', type: 'string' }
      ];

      expect(generateFilterExpression(filters, '&&')).toBe('No valid filters configured');
    });

    it('should quote string values', () => {
      const filters: FilterConfig[] = [
        { id: 1, target: 'message', field: 'text', operator: 'contains', value: 'hello', type: 'string' }
      ];

      const result = generateFilterExpression(filters, '&&');
      expect(result).toBe('message.text contains "hello"');
    });
  });

  describe('isValidFilter', () => {
    it('should validate complete filters', () => {
      const filter: FilterConfig = {
        id: 1,
        target: 'message',
        field: 'type',
        operator: '==',
        value: 'alert',
        type: 'string'
      };

      expect(isValidFilter(filter)).toBe(true);
    });

    it('should reject incomplete filters', () => {
      const incompleteFilter: FilterConfig = {
        id: 1,
        target: '',
        field: 'type',
        operator: '==',
        value: 'alert',
        type: 'string'
      };

      expect(isValidFilter(incompleteFilter)).toBe(false);
    });
  });

  describe('createDefaultFilter', () => {
    it('should create filter with correct defaults', () => {
      const filter = createDefaultFilter(123);

      expect(filter.id).toBe(123);
      expect(filter.target).toBe('message');
      expect(filter.field).toBe('');
      expect(filter.operator).toBe('==');
      expect(filter.value).toBe('');
      expect(filter.type).toBe('string');
    });
  });

  describe('formatMessagePayload', () => {
    it('should format valid JSON strings', () => {
      const json = '{"name":"test","value":123}';
      const result = formatMessagePayload(json);
      
      expect(result).toContain('{\n');
      expect(result).toContain('  "name": "test"');
    });

    it('should return string as-is if not valid JSON', () => {
      const text = 'plain text message';
      expect(formatMessagePayload(text)).toBe(text);
    });

    it('should format objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = formatMessagePayload(obj);
      
      expect(result).toContain('{\n');
      expect(result).toContain('  "name": "test"');
    });
  });

  describe('isValidJSON', () => {
    it('should validate correct JSON', () => {
      expect(isValidJSON('{"test": true}')).toBe(true);
      expect(isValidJSON('[1, 2, 3]')).toBe(true);
      expect(isValidJSON('"string"')).toBe(true);
      expect(isValidJSON('123')).toBe(true);
    });

    it('should reject invalid JSON', () => {
      expect(isValidJSON('{')).toBe(false);
      expect(isValidJSON('undefined')).toBe(false);
      expect(isValidJSON('test')).toBe(false);
    });
  });

  describe('isValidTTL', () => {
    it('should validate correct TTL values', () => {
      expect(isValidTTL('')).toBe(true); // Empty is valid
      expect(isValidTTL('24')).toBe(true);
      expect(isValidTTL('1')).toBe(true);
    });

    it('should reject invalid TTL values', () => {
      expect(isValidTTL('0')).toBe(false);
      expect(isValidTTL('-1')).toBe(false);
      expect(isValidTTL('abc')).toBe(false);
    });
  });

  describe('isValidHeartbeat', () => {
    it('should validate correct heartbeat values', () => {
      expect(isValidHeartbeat(300)).toBe(true);
      expect(isValidHeartbeat(10)).toBe(true);
      expect(isValidHeartbeat(3600)).toBe(true);
    });

    it('should reject invalid heartbeat values', () => {
      expect(isValidHeartbeat(5)).toBe(false); // Too low
      expect(isValidHeartbeat(3601)).toBe(false); // Too high
      expect(isValidHeartbeat(NaN)).toBe(false);
    });
  });

  describe('generateUniqueId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('number');
      expect(typeof id2).toBe('number');
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const fn = () => callCount++;
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(callCount).toBe(0);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(callCount).toBe(1);
    });
  });
});