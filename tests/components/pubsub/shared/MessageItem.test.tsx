import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageItem } from '@/components/pubsub/shared/MessageItem';
import type { MessageData, PresenceEvent } from '@/components/pubsub/types';

describe('MessageItem', () => {
  const mockMessage: MessageData = {
    channel: 'test-channel',
    message: { text: 'Hello World', timestamp: Date.now() },
    timetoken: '16234567890000000',
    publisher: 'user-123',
    subscription: 'test-channel',
    messageType: 'text',
    meta: { source: 'mobile-app', version: '1.2.3' }
  };

  const mockPresenceEvent: PresenceEvent = {
    channel: 'test-channel',
    action: 'join',
    occupancy: 2,
    uuid: 'user-456',
    timestamp: 1623456789,
    timetoken: '16234567890000000',
    messageType: 'presence',
    state: { mood: 'happy', status: 'online' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message Rendering', () => {
    it('renders formatted message view by default', () => {
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      expect(screen.getByText('#test-channel')).toBeInTheDocument();
      expect(screen.getByText('from: user-123')).toBeInTheDocument();
      expect(screen.getByText('text')).toBeInTheDocument();
      expect(screen.getByText(/"text": "Hello World"/)).toBeInTheDocument();
    });

    it('displays message content in formatted JSON', () => {
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      const messageContent = screen.getByText(/"text": "Hello World"/);
      expect(messageContent).toBeInTheDocument();
      expect(messageContent.closest('pre')).toHaveClass('font-mono');
    });

    it('displays timestamp in readable format', () => {
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      // Should format the timetoken (16234567890000000 / 10000 = 1623456789000)
      const timestamp = new Date(1623456789000).toLocaleTimeString();
      expect(screen.getByText(timestamp)).toBeInTheDocument();
    });

    it('shows meta information when present', () => {
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      expect(screen.getByText('Meta:')).toBeInTheDocument();
      expect(screen.getByText(/"source": "mobile-app"/)).toBeInTheDocument();
      expect(screen.getByText(/"version": "1.2.3"/)).toBeInTheDocument();
    });

    it('shows subscription info when different from channel', () => {
      const messageWithDifferentSubscription = {
        ...mockMessage,
        subscription: 'wildcard-*'
      };
      
      render(<MessageItem message={messageWithDifferentSubscription} showRawData={false} type="message" />);
      
      expect(screen.getByText('via subscription: wildcard-*')).toBeInTheDocument();
    });

    it('hides subscription info when same as channel', () => {
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      expect(screen.queryByText(/via subscription:/)).not.toBeInTheDocument();
    });

    it('handles message without optional fields', () => {
      const simpleMessage = {
        channel: 'simple-channel',
        message: 'Simple text',
        timetoken: '16234567890000000'
      };
      
      render(<MessageItem message={simpleMessage} showRawData={false} type="message" />);
      
      expect(screen.getByText('#simple-channel')).toBeInTheDocument();
      expect(screen.getByText('"Simple text"')).toBeInTheDocument();
      expect(screen.queryByText(/from:/)).not.toBeInTheDocument();
      expect(screen.queryByText('Meta:')).not.toBeInTheDocument();
    });
  });

  describe('Presence Event Rendering', () => {
    it('renders formatted presence event view', () => {
      render(<MessageItem message={mockPresenceEvent} showRawData={false} type="presence" />);
      
      expect(screen.getByText('#test-channel')).toBeInTheDocument();
      expect(screen.getByText('join')).toBeInTheDocument();
      expect(screen.getByText('user-456')).toBeInTheDocument();
      expect(screen.getByText('Occupancy: 2')).toBeInTheDocument();
    });

    it('applies correct styling for different presence actions', () => {
      const actions = [
        { action: 'join', expectedClass: 'text-green-600 bg-green-100' },
        { action: 'leave', expectedClass: 'text-red-600 bg-red-100' },
        { action: 'timeout', expectedClass: 'text-yellow-600 bg-yellow-100' },
        { action: 'state-change', expectedClass: 'text-blue-600 bg-blue-100' }
      ];

      actions.forEach(({ action, expectedClass }) => {
        const event = { ...mockPresenceEvent, action };
        const { unmount } = render(<MessageItem message={event} showRawData={false} type="presence" />);
        
        const actionElement = screen.getByText(action);
        expect(actionElement).toHaveClass(expectedClass);
        
        unmount();
      });
    });

    it('displays presence state when available', () => {
      render(<MessageItem message={mockPresenceEvent} showRawData={false} type="presence" />);
      
      expect(screen.getByText(/"mood": "happy"/)).toBeInTheDocument();
      expect(screen.getByText(/"status": "online"/)).toBeInTheDocument();
    });

    it('handles presence event without state', () => {
      const eventWithoutState = { ...mockPresenceEvent };
      delete (eventWithoutState as any).state;
      
      render(<MessageItem message={eventWithoutState} showRawData={false} type="presence" />);
      
      expect(screen.getByText('join')).toBeInTheDocument();
      expect(screen.queryByText(/"mood":/)).not.toBeInTheDocument();
    });

    it('uses green color scheme for presence events', () => {
      render(<MessageItem message={mockPresenceEvent} showRawData={false} type="presence" />);
      
      const container = screen.getByText('#test-channel').closest('div');
      expect(container).toHaveClass('border-green-200');
    });
  });

  describe('Raw Data View', () => {
    it('renders raw data for messages when showRawData is true', () => {
      render(<MessageItem message={mockMessage} showRawData={true} type="message" />);
      
      // Should show JSON structure with all fields
      expect(screen.getByText(/"channel": "test-channel"/)).toBeInTheDocument();
      expect(screen.getByText(/"timetoken": "16234567890000000"/)).toBeInTheDocument();
      expect(screen.getByText(/"publisher": "user-123"/)).toBeInTheDocument();
      expect(screen.getByText(/"messageType": "text"/)).toBeInTheDocument();
    });

    it('renders raw data for presence events when showRawData is true', () => {
      render(<MessageItem message={mockPresenceEvent} showRawData={true} type="presence" />);
      
      // Should show presence-specific JSON structure
      expect(screen.getByText(/"channel": "test-channel"/)).toBeInTheDocument();
      expect(screen.getByText(/"action": "join"/)).toBeInTheDocument();
      expect(screen.getByText(/"occupancy": 2/)).toBeInTheDocument();
      expect(screen.getByText(/"uuid": "user-456"/)).toBeInTheDocument();
      expect(screen.getByText(/"messageType": "presence"/)).toBeInTheDocument();
    });

    it('uses different background colors for raw data', () => {
      const { rerender } = render(<MessageItem message={mockMessage} showRawData={true} type="message" />);
      
      let rawDataElement = screen.getByText(/"channel": "test-channel"/).closest('pre');
      expect(rawDataElement).toHaveClass('bg-gray-100');
      
      rerender(<MessageItem message={mockPresenceEvent} showRawData={true} type="presence" />);
      
      rawDataElement = screen.getByText(/"channel": "test-channel"/).closest('pre');
      expect(rawDataElement).toHaveClass('bg-green-100');
    });

    it('includes null values in raw data for messages', () => {
      const messageWithNulls = {
        ...mockMessage,
        publisher: undefined,
        meta: undefined
      };
      
      render(<MessageItem message={messageWithNulls} showRawData={true} type="message" />);
      
      expect(screen.getByText(/"publisher": null/)).toBeInTheDocument();
      expect(screen.getByText(/"meta": null/)).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('correctly formats timetokens as timestamps', () => {
      // Test with string timetoken
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      const expectedTime = new Date(1623456789000).toLocaleTimeString();
      expect(screen.getByText(expectedTime)).toBeInTheDocument();
    });

    it('handles numeric timetokens', () => {
      const messageWithNumericTimetoken = {
        ...mockMessage,
        timetoken: 16234567890000000
      };
      
      render(<MessageItem message={messageWithNumericTimetoken} showRawData={false} type="message" />);
      
      const expectedTime = new Date(1623456789000).toLocaleTimeString();
      expect(screen.getByText(expectedTime)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message objects', () => {
      const emptyMessage = {
        channel: 'test',
        message: {},
        timetoken: '16234567890000000'
      };
      
      render(<MessageItem message={emptyMessage} showRawData={false} type="message" />);
      
      expect(screen.getByText('#test')).toBeInTheDocument();
      expect(screen.getByText('{}')).toBeInTheDocument();
    });

    it('handles complex nested message objects', () => {
      const complexMessage = {
        ...mockMessage,
        message: {
          user: { id: 123, name: 'John' },
          content: { text: 'Hello', media: { type: 'image', url: 'test.jpg' } },
          metadata: { tags: ['important', 'urgent'] }
        }
      };
      
      render(<MessageItem message={complexMessage} showRawData={false} type="message" />);
      
      expect(screen.getByText(/"user"/)).toBeInTheDocument();
      expect(screen.getByText(/"content"/)).toBeInTheDocument();
      expect(screen.getByText(/"metadata"/)).toBeInTheDocument();
    });

    it('handles unknown presence actions gracefully', () => {
      const unknownActionEvent = {
        ...mockPresenceEvent,
        action: 'unknown-action' as any
      };
      
      render(<MessageItem message={unknownActionEvent} showRawData={false} type="presence" />);
      
      const actionElement = screen.getByText('unknown-action');
      expect(actionElement).toHaveClass('text-gray-600 bg-gray-100');
    });

    it('defaults to message type when type prop is undefined', () => {
      render(<MessageItem message={mockMessage} showRawData={false} />);
      
      // Should render as message (not presence)
      expect(screen.getByText('#test-channel')).toBeInTheDocument();
      expect(screen.getByText('from: user-123')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper semantic structure', () => {
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      const preElements = screen.getAllByRole('generic').filter(el => 
        el.tagName.toLowerCase() === 'pre'
      );
      expect(preElements.length).toBeGreaterThan(0);
    });

    it('uses monospace font for code elements', () => {
      render(<MessageItem message={mockMessage} showRawData={false} type="message" />);
      
      const codeElements = document.querySelectorAll('.font-mono');
      expect(codeElements.length).toBeGreaterThan(0);
    });
  });
});