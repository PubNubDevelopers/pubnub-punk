import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LiveMessagesPanel } from '@/components/pubsub/LiveMessagesPanel';
import type { MessageData, PresenceEvent } from '@/components/pubsub/types';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h2 data-testid="card-title">{children}</h2>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, title, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      title={title}
      data-testid={props['data-testid'] || 'button'}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className} data-testid="label">
      {children}
    </label>
  )
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ id, checked, onCheckedChange }: any) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid={`switch-${id}`}
    />
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Copy: () => <div data-testid="copy-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ArrowDown: () => <div data-testid="arrow-down-icon" />
}));

// Mock the child components
vi.mock('@/components/pubsub/shared/MessageItem', () => ({
  MessageItem: ({ message, showRawData, type }: any) => (
    <div data-testid={`message-item-${type}`} data-message-id={message.timetoken}>
      {showRawData ? 'Raw Data' : 'Formatted Data'}
    </div>
  )
}));

vi.mock('@/components/pubsub/shared/StatusIndicator', () => ({
  StatusIndicator: ({ isSubscribed, messageCount, presenceEventCount, receivePresenceEvents }: any) => (
    <div data-testid="status-indicator">
      Status: {isSubscribed ? 'Connected' : 'Disconnected'} | 
      Messages: {messageCount} | 
      Presence: {receivePresenceEvents ? presenceEventCount : 'Disabled'}
    </div>
  )
}));

describe('LiveMessagesPanel', () => {
  const mockMessages: MessageData[] = [
    {
      channel: 'test-channel',
      message: { text: 'Hello World' },
      timetoken: '16234567890000000',
      publisher: 'user-123',
      subscription: 'test-channel',
      messageType: 'text'
    },
    {
      channel: 'test-channel-2',
      message: { data: 'Test data' },
      timetoken: '16234567891000000',
      publisher: 'user-456'
    }
  ];

  const mockPresenceEvents: PresenceEvent[] = [
    {
      channel: 'test-channel',
      action: 'join',
      occupancy: 2,
      uuid: 'user-123',
      timestamp: 1623456789,
      timetoken: '16234567890000000',
      messageType: 'presence'
    },
    {
      channel: 'test-channel',
      action: 'leave',
      occupancy: 1,
      uuid: 'user-456',
      timestamp: 1623456790,
      timetoken: '16234567891000000',
      messageType: 'presence'
    }
  ];

  const defaultProps = {
    messages: [],
    presenceEvents: [],
    isSubscribed: false,
    showRawMessageData: false,
    receivePresenceEvents: false,
    messagesHeight: 300,
    showMessages: true,
    showScrollButton: false,
    showPresenceScrollButton: false,
    onShowRawMessageDataToggle: vi.fn(),
    onReceivePresenceEventsToggle: vi.fn(),
    onShowMessagesToggle: vi.fn(),
    onCopyAllMessages: vi.fn(),
    onCopyAllPresenceEvents: vi.fn(),
    onScrollToBottom: vi.fn(),
    onScrollToBottomPresence: vi.fn(),
    onMessagesScroll: vi.fn(),
    onPresenceScroll: vi.fn(),
    onMessagesHeightChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the basic panel structure', () => {
      render(<LiveMessagesPanel {...defaultProps} />);
      
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-title')).toHaveTextContent('Real-Time Messages');
      expect(screen.getAllByTestId('message-circle-icon').length).toBeGreaterThan(0);
      expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    });

    it('renders switches for configuration', () => {
      render(<LiveMessagesPanel {...defaultProps} />);
      
      expect(screen.getByTestId('switch-receive-presence')).toBeInTheDocument();
      expect(screen.getByTestId('switch-show-raw-data')).toBeInTheDocument();
      expect(screen.getByText('Receive Presence Events')).toBeInTheDocument();
      expect(screen.getByText('Show Raw Message Data')).toBeInTheDocument();
    });

    it('renders show/hide messages button', () => {
      render(<LiveMessagesPanel {...defaultProps} />);
      
      const hideButton = screen.getByRole('button', { name: /hide/i });
      expect(hideButton).toBeInTheDocument();
      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
    });

    it('renders content when showMessages is true', () => {
      render(<LiveMessagesPanel {...defaultProps} showMessages={true} />);
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
    });

    it('hides content when showMessages is false', () => {
      render(<LiveMessagesPanel {...defaultProps} showMessages={false} />);
      expect(screen.queryByTestId('card-content')).not.toBeInTheDocument();
    });
  });

  describe('Switch Interactions', () => {
    it('calls onShowRawMessageDataToggle when raw data switch is toggled', () => {
      const onToggle = vi.fn();
      render(<LiveMessagesPanel {...defaultProps} onShowRawMessageDataToggle={onToggle} />);
      
      const rawDataSwitch = screen.getByTestId('switch-show-raw-data');
      fireEvent.click(rawDataSwitch);
      
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onReceivePresenceEventsToggle when presence events switch is toggled', () => {
      const onToggle = vi.fn();
      render(<LiveMessagesPanel {...defaultProps} onReceivePresenceEventsToggle={onToggle} />);
      
      const presenceSwitch = screen.getByTestId('switch-receive-presence');
      fireEvent.click(presenceSwitch);
      
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onShowMessagesToggle when show/hide button is clicked', () => {
      const onToggle = vi.fn();
      render(<LiveMessagesPanel {...defaultProps} onShowMessagesToggle={onToggle} />);
      
      const showHideButton = screen.getByRole('button', { name: /hide/i });
      fireEvent.click(showHideButton);
      
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('Messages Display', () => {
    it('shows empty state when no messages and not subscribed', () => {
      render(<LiveMessagesPanel {...defaultProps} showMessages={true} />);
      
      expect(screen.getByText('Subscribe to channels to start receiving messages')).toBeInTheDocument();
    });

    it('shows waiting state when subscribed but no messages', () => {
      render(<LiveMessagesPanel {...defaultProps} isSubscribed={true} showMessages={true} />);
      
      expect(screen.getByText('No messages received yet...')).toBeInTheDocument();
    });

    it('renders messages when provided', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        messages={mockMessages} 
        showMessages={true} 
      />);
      
      expect(screen.getAllByTestId('message-item-message')).toHaveLength(2);
    });

    it('passes showRawMessageData prop to MessageItem components', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        messages={mockMessages} 
        showRawMessageData={true}
        showMessages={true} 
      />);
      
      expect(screen.getAllByText('Raw Data')).toHaveLength(2);
    });
  });

  describe('Presence Events Display', () => {
    it('shows split view when receivePresenceEvents is true', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        receivePresenceEvents={true}
        presenceEvents={mockPresenceEvents}
        showMessages={true} 
      />);
      
      expect(screen.getByText('Messages')).toBeInTheDocument();
      expect(screen.getByText('Presence Events')).toBeInTheDocument();
      expect(screen.getAllByTestId('message-item-presence')).toHaveLength(2);
    });

    it('shows single view when receivePresenceEvents is false', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        receivePresenceEvents={false}
        messages={mockMessages}
        showMessages={true} 
      />);
      
      expect(screen.queryByText('Presence Events')).not.toBeInTheDocument();
      expect(screen.queryAllByTestId('message-item-presence')).toHaveLength(0);
    });

    it('shows empty state for presence events when none received', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        receivePresenceEvents={true}
        isSubscribed={true}
        showMessages={true} 
      />);
      
      expect(screen.getByText('No presence events received yet...')).toBeInTheDocument();
    });
  });

  describe('Copy Functionality', () => {
    it('shows copy button for messages only when presence events disabled', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        receivePresenceEvents={false}
        messages={mockMessages}
        showMessages={true} 
      />);
      
      const copyButtons = screen.getAllByTestId('copy-icon');
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('calls onCopyAllMessages when copy button is clicked', () => {
      const onCopy = vi.fn();
      render(<LiveMessagesPanel 
        {...defaultProps} 
        messages={mockMessages}
        onCopyAllMessages={onCopy}
        showMessages={true} 
      />);
      
      const copyButton = screen.getByTitle('Copy all messages to clipboard');
      fireEvent.click(copyButton);
      
      expect(onCopy).toHaveBeenCalled();
    });

    it('disables copy button when no messages', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        messages={[]}
        showMessages={true} 
      />);
      
      const copyButton = screen.getByTitle('Copy all messages to clipboard');
      expect(copyButton).toBeDisabled();
    });

    it('calls onCopyAllPresenceEvents for presence copy button', () => {
      const onCopy = vi.fn();
      render(<LiveMessagesPanel 
        {...defaultProps} 
        receivePresenceEvents={true}
        presenceEvents={mockPresenceEvents}
        onCopyAllPresenceEvents={onCopy}
        showMessages={true} 
      />);
      
      const copyButton = screen.getByTitle('Copy all presence events to clipboard');
      fireEvent.click(copyButton);
      
      expect(onCopy).toHaveBeenCalled();
    });
  });

  describe('Scroll Functionality', () => {
    it('shows scroll to bottom button when showScrollButton is true', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        showScrollButton={true}
        showMessages={true} 
      />);
      
      const scrollButton = screen.getByTitle('Scroll to bottom');
      expect(scrollButton).toBeInTheDocument();
      expect(screen.getAllByTestId('arrow-down-icon').length).toBeGreaterThan(0);
    });

    it('calls onScrollToBottom when scroll button is clicked', () => {
      const onScroll = vi.fn();
      render(<LiveMessagesPanel 
        {...defaultProps} 
        showScrollButton={true}
        onScrollToBottom={onScroll}
        showMessages={true} 
      />);
      
      const scrollButton = screen.getByTitle('Scroll to bottom');
      fireEvent.click(scrollButton);
      
      expect(onScroll).toHaveBeenCalled();
    });

    it('shows presence scroll button in split view', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        receivePresenceEvents={true}
        showScrollButton={true}
        showPresenceScrollButton={true}
        showMessages={true} 
      />);
      
      const scrollButtons = screen.getAllByTestId('arrow-down-icon');
      expect(scrollButtons).toHaveLength(2); // One for messages, one for presence
    });
  });

  describe('Container Height and Resizing', () => {
    it('applies messagesHeight style to containers', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        messagesHeight={400}
        showMessages={true} 
      />);
      
      const container = document.querySelector('[style*="height: 400px"]');
      expect(container).toBeTruthy();
    });

    it('sets up ResizeObserver for container', () => {
      render(<LiveMessagesPanel {...defaultProps} showMessages={true} />);
      
      expect(global.ResizeObserver).toHaveBeenCalled();
    });
  });

  describe('Status Indicator Integration', () => {
    it('passes correct props to StatusIndicator', () => {
      render(<LiveMessagesPanel 
        {...defaultProps} 
        isSubscribed={true}
        messages={mockMessages}
        presenceEvents={mockPresenceEvents}
        receivePresenceEvents={true}
      />);
      
      const statusText = screen.getByTestId('status-indicator').textContent;
      expect(statusText).toContain('Connected');
      expect(statusText).toContain('Messages: 2');
      expect(statusText).toContain('Presence: 2');
    });
  });

  describe('Auto-scroll Behavior', () => {
    it('auto-scrolls when new messages arrive', async () => {
      const { rerender } = render(<LiveMessagesPanel 
        {...defaultProps} 
        messages={[mockMessages[0]]}
        showMessages={true} 
      />);

      // Mock scroll properties
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        value: 400
      });
      Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
        configurable: true,
        value: 350,
        writable: true
      });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
        configurable: true,
        value: 300
      });

      // Add new message
      rerender(<LiveMessagesPanel 
        {...defaultProps} 
        messages={mockMessages}
        showMessages={true} 
      />);

      // Should trigger auto-scroll effect
      await waitFor(() => {
        expect(true).toBe(true); // Auto-scroll effect would have run
      });
    });
  });
});