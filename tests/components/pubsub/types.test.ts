// Unit tests for PubSub types and constants
import { describe, it, expect } from 'vitest';
import {
  FIELD_DEFINITIONS,
  CURRENT_CONFIG_VERSION,
  CONFIG_MIGRATIONS,
  FieldDefinition,
  PublishFormData,
  SubscribeFormData,
  UIState,
  FilterState,
  FilterConfig,
  PubSubConfig
} from '../../../src/components/pubsub/types';

describe('PubSub Types', () => {
  describe('FIELD_DEFINITIONS', () => {
    it('should contain all required publish fields', () => {
      const publishFields = Object.keys(FIELD_DEFINITIONS).filter(key => key.startsWith('publish.'));
      
      expect(publishFields).toContain('publish.channel');
      expect(publishFields).toContain('publish.message');
      expect(publishFields).toContain('publish.storeInHistory');
      expect(publishFields).toContain('publish.sendByPost');
      expect(publishFields).toContain('publish.ttl');
      expect(publishFields).toContain('publish.customMessageType');
      expect(publishFields).toContain('publish.meta');
    });

    it('should contain all required subscribe fields', () => {
      const subscribeFields = Object.keys(FIELD_DEFINITIONS).filter(key => key.startsWith('subscribe.'));
      
      expect(subscribeFields).toContain('subscribe.channels');
      expect(subscribeFields).toContain('subscribe.channelGroups');
      expect(subscribeFields).toContain('subscribe.receivePresenceEvents');
      expect(subscribeFields).toContain('subscribe.cursor.timetoken');
      expect(subscribeFields).toContain('subscribe.cursor.region');
      expect(subscribeFields).toContain('subscribe.withPresence');
      expect(subscribeFields).toContain('subscribe.heartbeat');
      expect(subscribeFields).toContain('subscribe.restoreOnReconnect');
    });

    it('should contain all required UI fields', () => {
      const uiFields = Object.keys(FIELD_DEFINITIONS).filter(key => key.startsWith('ui.'));
      
      expect(uiFields).toContain('ui.showAdvanced');
      expect(uiFields).toContain('ui.showFilters');
      expect(uiFields).toContain('ui.showMessages');
      expect(uiFields).toContain('ui.messagesHeight');
      expect(uiFields).toContain('ui.showRawMessageData');
    });

    it('should contain filter fields', () => {
      const filterFields = Object.keys(FIELD_DEFINITIONS).filter(key => key.startsWith('filters.'));
      
      expect(filterFields).toContain('filters.logic');
    });

    it('should have correct default values for publish fields', () => {
      expect(FIELD_DEFINITIONS['publish.channel'].default).toBe('hello_world');
      expect(FIELD_DEFINITIONS['publish.storeInHistory'].default).toBe(true);
      expect(FIELD_DEFINITIONS['publish.sendByPost'].default).toBe(false);
      expect(FIELD_DEFINITIONS['publish.customMessageType'].default).toBe('text-message');
    });

    it('should have correct default values for subscribe fields', () => {
      expect(FIELD_DEFINITIONS['subscribe.channels'].default).toBe('hello_world');
      expect(FIELD_DEFINITIONS['subscribe.channelGroups'].default).toBe('');
      expect(FIELD_DEFINITIONS['subscribe.receivePresenceEvents'].default).toBe(false);
      expect(FIELD_DEFINITIONS['subscribe.heartbeat'].default).toBe(300);
      expect(FIELD_DEFINITIONS['subscribe.restoreOnReconnect'].default).toBe(true);
    });

    it('should have correct types for all fields', () => {
      Object.entries(FIELD_DEFINITIONS).forEach(([key, definition]) => {
        expect(['string', 'number', 'boolean']).toContain(definition.type);
        expect(typeof definition.default).toBe(definition.type);
      });
    });
  });

  describe('CONFIG_MIGRATIONS', () => {
    it('should have migration for version 1', () => {
      expect(CONFIG_MIGRATIONS[1]).toBeDefined();
      expect(typeof CONFIG_MIGRATIONS[1]).toBe('function');
    });

    it('should return input unchanged for version 1 migration', () => {
      const testConfig = { test: 'value' };
      const result = CONFIG_MIGRATIONS[1](testConfig);
      expect(result).toEqual(testConfig);
    });
  });

  describe('CURRENT_CONFIG_VERSION', () => {
    it('should be version 1', () => {
      expect(CURRENT_CONFIG_VERSION).toBe(1);
    });
  });
});

describe('Interface Validation', () => {
  describe('PublishFormData', () => {
    it('should accept valid publish data', () => {
      const publishData: PublishFormData = {
        channel: 'test-channel',
        message: '{"test": true}',
        storeInHistory: true,
        sendByPost: false,
        ttl: '24',
        customMessageType: 'test-message',
        meta: '{"source": "test"}'
      };

      expect(publishData.channel).toBe('test-channel');
      expect(publishData.storeInHistory).toBe(true);
    });
  });

  describe('SubscribeFormData', () => {
    it('should accept valid subscribe data', () => {
      const subscribeData: SubscribeFormData = {
        channels: 'ch1, ch2',
        channelGroups: 'group1',
        receivePresenceEvents: true,
        cursor: { timetoken: '12345', region: '1' },
        withPresence: false,
        heartbeat: 300,
        restoreOnReconnect: true
      };

      expect(subscribeData.channels).toBe('ch1, ch2');
      expect(subscribeData.cursor.timetoken).toBe('12345');
    });
  });

  describe('FilterConfig', () => {
    it('should accept valid filter configuration', () => {
      const filter: FilterConfig = {
        id: 1,
        target: 'message',
        field: 'type',
        operator: '==',
        value: 'alert',
        type: 'string'
      };

      expect(filter.id).toBe(1);
      expect(filter.type).toBe('string');
    });
  });

  describe('PubSubConfig', () => {
    it('should accept complete configuration', () => {
      const config: PubSubConfig = {
        publish: {
          channel: 'test',
          message: '{}',
          storeInHistory: true,
          sendByPost: false,
          ttl: '',
          customMessageType: 'test',
          meta: ''
        },
        subscribe: {
          channels: 'test',
          channelGroups: '',
          receivePresenceEvents: false,
          cursor: { timetoken: '', region: '' },
          withPresence: false,
          heartbeat: 300,
          restoreOnReconnect: true
        },
        ui: {
          showAdvanced: false,
          showFilters: false,
          showMessages: true,
          messagesHeight: 200,
          showRawMessageData: false
        },
        filters: {
          logic: '&&',
          conditions: []
        },
        _version: 1
      };

      expect(config._version).toBe(1);
      expect(config.publish.channel).toBe('test');
      expect(config.ui.showMessages).toBe(true);
    });
  });
});