import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickPublishPanel } from '@/components/pubsub/QuickPublishPanel';
import { PublishFormData, PublishStatus } from '@/components/pubsub/types';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('QuickPublishPanel', () => {
  const defaultPublishData: PublishFormData = {
    channel: 'test_channel',
    message: '{"text": "Hello, World!"}',
    storeInHistory: true,
    sendByPost: false,
    ttl: '',
    customMessageType: 'text-message',
    meta: ''
  };

  const defaultProps = {
    publishData: defaultPublishData,
    publishStatus: 'idle' as PublishStatus,
    onPublishDataChange: vi.fn(),
    onFormatMessage: vi.fn(),
    onPublish: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with correct title and icon', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      expect(screen.getByText('Quick Publish')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /publish message/i })).toBeInTheDocument();
    });

    it('renders all form fields with correct values', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      // Channel input
      const channelInput = screen.getByLabelText(/channel/i);
      expect(channelInput).toHaveValue('test_channel');
      
      // Message textarea
      const messageInput = screen.getByLabelText(/message/i);
      expect(messageInput).toHaveValue('{"text": "Hello, World!"}');
      
      // Switches
      expect(screen.getByLabelText(/store in history/i)).toBeChecked();
      expect(screen.getByLabelText(/send by post/i)).not.toBeChecked();
    });

    it('renders format JSON button', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /format json/i })).toBeInTheDocument();
    });

    it('renders advanced options collapsed by default', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      expect(screen.getByText('Advanced Options')).toBeInTheDocument();
      expect(screen.queryByLabelText(/ttl/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/custom message type/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/meta/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('calls onPublishDataChange when channel input changes', () => {
      const onPublishDataChange = vi.fn();
      render(<QuickPublishPanel {...defaultProps} onPublishDataChange={onPublishDataChange} />);
      
      const channelInput = screen.getByLabelText(/channel/i);
      fireEvent.change(channelInput, { target: { value: 'new_channel' } });
      
      expect(onPublishDataChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls onPublishDataChange when message textarea changes', () => {
      const onPublishDataChange = vi.fn();
      render(<QuickPublishPanel {...defaultProps} onPublishDataChange={onPublishDataChange} />);
      
      const messageInput = screen.getByLabelText(/message/i);
      fireEvent.change(messageInput, { target: { value: 'New message content' } });
      
      expect(onPublishDataChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls onPublishDataChange when switches are toggled', () => {
      const onPublishDataChange = vi.fn();
      render(<QuickPublishPanel {...defaultProps} onPublishDataChange={onPublishDataChange} />);
      
      const storeInHistorySwitch = screen.getByLabelText(/store in history/i);
      fireEvent.click(storeInHistorySwitch);
      
      expect(onPublishDataChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('formats message when Format JSON button is clicked', () => {
      const onPublishDataChange = vi.fn();
      const publishData = { ...defaultPublishData, message: '{"text":"Hello","user":"John"}' };
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} onPublishDataChange={onPublishDataChange} />);
      
      const formatButton = screen.getByRole('button', { name: /format json/i });
      fireEvent.click(formatButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Message Formatted",
        description: "JSON message has been formatted successfully.",
      });
    });

    it('calls onPublish when publish button is clicked', () => {
      const onPublish = vi.fn();
      render(<QuickPublishPanel {...defaultProps} onPublish={onPublish} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(onPublish).toHaveBeenCalled();
    });
  });

  describe('Advanced Options', () => {
    it('expands advanced options when clicked', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);
      
      expect(screen.getByLabelText(/ttl/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/custom message type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/meta/i)).toBeInTheDocument();
    });

    it('renders advanced fields with correct values when expanded', () => {
      const publishData = {
        ...defaultPublishData,
        ttl: '24',
        customMessageType: 'custom-type',
        meta: '{"key": "value"}'
      };
      
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} />);
      
      // Expand advanced options
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);
      
      expect(screen.getByLabelText(/ttl/i)).toHaveValue(24);
      expect(screen.getByLabelText(/custom message type/i)).toHaveValue('custom-type');
      expect(screen.getByLabelText(/meta/i)).toHaveValue('{"key": "value"}');
    });

    it('updates advanced fields when changed', () => {
      const onPublishDataChange = vi.fn();
      render(<QuickPublishPanel {...defaultProps} onPublishDataChange={onPublishDataChange} />);
      
      // Expand advanced options
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);
      
      // Change TTL field
      const ttlInput = screen.getByLabelText(/ttl/i);
      fireEvent.change(ttlInput, { target: { value: '48' } });
      
      expect(onPublishDataChange).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Publish Status', () => {
    it('shows loading state when publishing', () => {
      render(<QuickPublishPanel {...defaultProps} publishStatus="publishing" />);
      
      const publishButton = screen.getByRole('button', { name: /publishing/i });
      expect(publishButton).toBeDisabled();
      expect(screen.getByText('Publishing...')).toBeInTheDocument();
    });

    it('shows success state after successful publish', () => {
      render(<QuickPublishPanel {...defaultProps} publishStatus="success" />);
      
      expect(screen.getByText('Message published successfully!')).toBeInTheDocument();
    });

    it('shows error state after failed publish', () => {
      render(<QuickPublishPanel {...defaultProps} publishStatus="error" />);
      
      expect(screen.getByText(/failed to publish message/i)).toBeInTheDocument();
    });

    it('disables publish button when required fields are empty', () => {
      const emptyData = { ...defaultPublishData, channel: '', message: '' };
      render(<QuickPublishPanel {...defaultProps} publishData={emptyData} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      expect(publishButton).toBeDisabled();
    });
  });

  describe('JSON Formatting', () => {
    it('formats valid JSON message when Format JSON button is clicked', () => {
      const publishData = { ...defaultPublishData, message: '{"text":"Hello","user":"John"}' };
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} />);
      
      const formatButton = screen.getByRole('button', { name: /format json/i });
      fireEvent.click(formatButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Message Formatted",
        description: "JSON message has been formatted successfully.",
      });
    });

    it('shows error toast for invalid JSON when Format JSON button is clicked', () => {
      const publishData = { ...defaultPublishData, message: '{"invalid": json}' };
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} />);
      
      const formatButton = screen.getByRole('button', { name: /format json/i });
      fireEvent.click(formatButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid JSON",
        description: "The message contains invalid JSON syntax.",
        variant: "destructive",
      });
    });
  });

  describe('Validation', () => {
    it('disables publish button when channel is empty', () => {
      const publishData = { ...defaultPublishData, channel: '  ' }; // Empty channel
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      expect(publishButton).toBeDisabled();
    });

    it('disables publish button when message is empty', () => {
      const publishData = { ...defaultPublishData, message: '  ' }; // Empty message
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      expect(publishButton).toBeDisabled();
    });

    it('validates JSON message format when publishing', async () => {
      const onPublish = vi.fn();
      const publishData = { ...defaultPublishData, message: '{"invalid": json}' };
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} onPublish={onPublish} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid JSON",
        description: "The message contains invalid JSON syntax. Please format or fix the JSON.",
        variant: "destructive",
      });
      expect(onPublish).not.toHaveBeenCalled();
    });

    it('validates TTL when publishing', async () => {
      const onPublish = vi.fn();
      const publishData = { ...defaultPublishData, ttl: 'invalid' };
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} />);
      
      // Expand advanced options
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid TTL",
        description: "TTL must be a positive number.",
        variant: "destructive",
      });
      expect(onPublish).not.toHaveBeenCalled();
    });

    it('validates meta JSON when publishing', async () => {
      const onPublish = vi.fn();
      const publishData = { ...defaultPublishData, meta: '{"invalid": json}' };
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid Meta",
        description: "Meta field must contain valid JSON.",
        variant: "destructive",
      });
      expect(onPublish).not.toHaveBeenCalled();
    });

    it('allows publishing with valid data', async () => {
      const onPublish = vi.fn();
      render(<QuickPublishPanel {...defaultProps} onPublish={onPublish} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(onPublish).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form inputs', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      expect(screen.getByLabelText(/channel/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/store in history/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/send by post/i)).toBeInTheDocument();
    });

    it('has proper labels for advanced form inputs when expanded', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      // Expand advanced options
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);
      
      expect(screen.getByLabelText(/ttl/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/custom message type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/meta/i)).toBeInTheDocument();
    });

    it('provides helpful descriptions for form fields', () => {
      render(<QuickPublishPanel {...defaultProps} />);
      
      // Expand advanced options to see all descriptions
      const advancedButton = screen.getByText('Advanced Options');
      fireEvent.click(advancedButton);
      
      expect(screen.getByText(/set message expiration in hours/i)).toBeInTheDocument();
      expect(screen.getByText(/specify a custom message type/i)).toBeInTheDocument();
      expect(screen.getByText(/additional metadata as json/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles non-JSON message content correctly', () => {
      const publishData = { ...defaultPublishData, message: 'Simple text message' };
      const onPublish = vi.fn();
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} onPublish={onPublish} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(onPublish).toHaveBeenCalled();
    });

    it('handles empty TTL field correctly', () => {
      const publishData = { ...defaultPublishData, ttl: '' };
      const onPublish = vi.fn();
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} onPublish={onPublish} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(onPublish).toHaveBeenCalled();
    });

    it('handles empty meta field correctly', () => {
      const publishData = { ...defaultPublishData, meta: '' };
      const onPublish = vi.fn();
      render(<QuickPublishPanel {...defaultProps} publishData={publishData} onPublish={onPublish} />);
      
      const publishButton = screen.getByRole('button', { name: /publish message/i });
      fireEvent.click(publishButton);
      
      expect(onPublish).toHaveBeenCalled();
    });

    it('disables Format JSON button when publishing', () => {
      render(<QuickPublishPanel {...defaultProps} publishStatus="publishing" />);
      
      const formatButton = screen.getByRole('button', { name: /format json/i });
      expect(formatButton).toBeDisabled();
    });
  });
});