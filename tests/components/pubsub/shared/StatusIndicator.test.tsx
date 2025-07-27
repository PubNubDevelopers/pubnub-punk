import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusIndicator } from '@/components/pubsub/shared/StatusIndicator';

describe('StatusIndicator', () => {
  const defaultProps = {
    isSubscribed: false,
    messageCount: 0,
    presenceEventCount: 0,
    receivePresenceEvents: false,
    activeFiltersCount: 0,
    connectionStatus: 'disconnected' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Status Indicator', () => {
    it('shows gray indicator when not subscribed', () => {
      render(<StatusIndicator {...defaultProps} isSubscribed={false} />);
      
      const indicator = document.querySelector('.bg-gray-400');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('title', 'Not connected');
    });

    it('shows green indicator when connected', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        connectionStatus="connected" 
      />);
      
      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('title', 'Connected');
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('shows yellow indicator when connecting', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        connectionStatus="connecting" 
      />);
      
      const indicator = document.querySelector('.bg-yellow-500');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('title', 'Connecting...');
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('shows orange indicator when reconnecting', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        connectionStatus="reconnecting" 
      />);
      
      const indicator = document.querySelector('.bg-orange-500');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('title', 'Reconnecting...');
      expect(indicator).toHaveClass('animate-pulse');
    });

    it('shows red indicator when disconnected but subscribed', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        connectionStatus="disconnected" 
      />);
      
      const indicator = document.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveAttribute('title', 'Disconnected');
    });
  });

  describe('Status Text Generation', () => {
    it('shows default message when not subscribed', () => {
      render(<StatusIndicator {...defaultProps} />);
      
      expect(screen.getByText('Subscribe to channels to see messages here')).toBeInTheDocument();
    });

    it('shows listening message with message count when subscribed', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        messageCount={5} 
      />);
      
      expect(screen.getByText('Listening for messages • 5 messages')).toBeInTheDocument();
    });

    it('shows singular message text for one message', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        messageCount={1} 
      />);
      
      expect(screen.getByText('Listening for messages • 1 message')).toBeInTheDocument();
    });

    it('includes presence events when enabled', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        messageCount={3} 
        presenceEventCount={2} 
        receivePresenceEvents={true} 
      />);
      
      expect(screen.getByText('Listening for messages • 3 messages • 2 presence events')).toBeInTheDocument();
    });

    it('shows singular presence event text for one event', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        messageCount={0} 
        presenceEventCount={1} 
        receivePresenceEvents={true} 
      />);
      
      expect(screen.getByText('Listening for messages • 0 messages • 1 presence event')).toBeInTheDocument();
    });

    it('excludes presence events when disabled', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        messageCount={3} 
        presenceEventCount={2} 
        receivePresenceEvents={false} 
      />);
      
      const statusText = screen.getByText(/Listening for messages • 3 messages$/);
      expect(statusText).toBeInTheDocument();
      expect(statusText).not.toHaveTextContent('presence');
    });

    it('includes active filters count in status text', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        messageCount={5} 
        activeFiltersCount={2} 
      />);
      
      expect(screen.getByText('Listening for messages • 5 messages • 2 active filters')).toBeInTheDocument();
    });

    it('shows singular filter text for one filter', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        isSubscribed={true} 
        messageCount={5} 
        activeFiltersCount={1} 
      />);
      
      expect(screen.getByText('Listening for messages • 5 messages • 1 active filter')).toBeInTheDocument();
    });
  });

  describe('Filter Badge', () => {
    it('shows filter badge when activeFiltersCount > 0', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        activeFiltersCount={3} 
      />);
      
      const badge = screen.getByText('3 filters');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('shows singular filter text in badge', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        activeFiltersCount={1} 
      />);
      
      expect(screen.getByText('1 filter')).toBeInTheDocument();
    });

    it('hides filter badge when activeFiltersCount is 0', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        activeFiltersCount={0} 
      />);
      
      expect(screen.queryByText(/filter/)).not.toBeInTheDocument();
    });

    it('hides filter badge when activeFiltersCount is undefined', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        activeFiltersCount={undefined} 
      />);
      
      expect(screen.queryByText(/filter/)).not.toBeInTheDocument();
    });
  });

  describe('Complex Status Combinations', () => {
    it('shows complete status with all features enabled', () => {
      render(<StatusIndicator 
        isSubscribed={true}
        messageCount={10}
        presenceEventCount={5}
        receivePresenceEvents={true}
        activeFiltersCount={3}
        connectionStatus="connected"
      />);
      
      // Should show status text
      expect(screen.getByText('Listening for messages • 10 messages • 5 presence events • 3 active filters')).toBeInTheDocument();
      
      // Should show connection indicator
      const indicator = document.querySelector('.bg-green-500');
      expect(indicator).toBeInTheDocument();
      
      // Should show filter badge
      expect(screen.getByText('3 filters')).toBeInTheDocument();
    });

    it('handles zero counts gracefully', () => {
      render(<StatusIndicator 
        isSubscribed={true}
        messageCount={0}
        presenceEventCount={0}
        receivePresenceEvents={true}
        activeFiltersCount={0}
        connectionStatus="connected"
      />);
      
      expect(screen.getByText('Listening for messages • 0 messages • 0 presence events')).toBeInTheDocument();
      expect(screen.queryByText(/filter/)).not.toBeInTheDocument();
    });

    it('handles large message counts', () => {
      render(<StatusIndicator 
        {...defaultProps}
        isSubscribed={true}
        messageCount={1000}
        presenceEventCount={500}
        receivePresenceEvents={true}
      />);
      
      expect(screen.getByText('Listening for messages • 1000 messages • 500 presence events')).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('uses default connectionStatus when not provided', () => {
      const propsWithoutConnectionStatus = {
        isSubscribed: true,
        messageCount: 5,
        presenceEventCount: 2,
        receivePresenceEvents: false
      };
      
      render(<StatusIndicator {...propsWithoutConnectionStatus} />);
      
      // Should default to disconnected
      const indicator = document.querySelector('.bg-red-500');
      expect(indicator).toBeInTheDocument();
    });

    it('uses default activeFiltersCount when not provided', () => {
      const propsWithoutFilters = {
        isSubscribed: true,
        messageCount: 5,
        presenceEventCount: 2,
        receivePresenceEvents: false,
        connectionStatus: 'connected' as const
      };
      
      render(<StatusIndicator {...propsWithoutFilters} />);
      
      // Should not show filter information
      expect(screen.queryByText(/filter/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility and Structure', () => {
    it('renders with proper semantic structure', () => {
      render(<StatusIndicator {...defaultProps} />);
      
      const container = screen.getByText('Subscribe to channels to see messages here').closest('div');
      expect(container).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('provides proper titles for connection indicators', () => {
      const statuses = [
        { status: 'connected', title: 'Connected' },
        { status: 'connecting', title: 'Connecting...' },
        { status: 'reconnecting', title: 'Reconnecting...' },
        { status: 'disconnected', title: 'Disconnected' }
      ] as const;

      statuses.forEach(({ status, title }) => {
        const { unmount } = render(<StatusIndicator 
          {...defaultProps} 
          isSubscribed={true} 
          connectionStatus={status} 
        />);
        
        const indicator = document.querySelector('[title]');
        expect(indicator).toHaveAttribute('title', title);
        
        unmount();
      });
    });

    it('uses appropriate color schemes for filter badges', () => {
      render(<StatusIndicator 
        {...defaultProps} 
        activeFiltersCount={2} 
      />);
      
      const badge = screen.getByText('2 filters');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('Edge Cases', () => {
    it('handles negative counts gracefully', () => {
      render(<StatusIndicator 
        {...defaultProps}
        isSubscribed={true}
        messageCount={-1}
        presenceEventCount={-5}
        receivePresenceEvents={true}
        activeFiltersCount={-2}
      />);
      
      // Should still render without breaking
      expect(screen.getByText('Listening for messages • -1 messages • -5 presence events • -2 active filters')).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(<StatusIndicator 
        {...defaultProps}
        isSubscribed={true}
        messageCount={999999}
        activeFiltersCount={100}
      />);
      
      expect(screen.getByText('Listening for messages • 999999 messages • 100 active filters')).toBeInTheDocument();
      expect(screen.getByText('100 filters')).toBeInTheDocument();
    });
  });
});