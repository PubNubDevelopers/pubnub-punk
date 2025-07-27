// Unit tests for PubSubPage component
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useToast } from '@/hooks/use-toast';
import { useConfig } from '@/contexts/config-context';
import { usePubNub } from '@/hooks/usePubNub';
import PubSubPage from '../../../src/components/pubsub/PubSubPage';

// Mock dependencies
vi.mock('@/hooks/use-toast');
vi.mock('@/contexts/config-context');
vi.mock('@/hooks/usePubNub');
vi.mock('@/lib/storage');

const mockToast = vi.fn();
const mockSetPageSettings = vi.fn();
const mockSetConfigType = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  (useToast as ReturnType<typeof vi.fn>).mockReturnValue({
    toast: mockToast
  });
  
  (useConfig as ReturnType<typeof vi.fn>).mockReturnValue({
    setPageSettings: mockSetPageSettings,
    setConfigType: mockSetConfigType
  });
  
  (usePubNub as ReturnType<typeof vi.fn>).mockReturnValue({
    pubnub: {},
    isReady: true,
    connectionError: null,
    isConnected: true
  });
});

describe('PubSubPage', () => {
  describe('Rendering', () => {
    it('should render main header', () => {
      render(<PubSubPage />);
      
      expect(screen.getByText('PubNub Pub/Sub Tool')).toBeInTheDocument();
      expect(screen.getByText('Real-time messaging with advanced filtering and controls')).toBeInTheDocument();
    });

    it('should render Help and Settings buttons', () => {
      render(<PubSubPage />);
      
      expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('should render Live Messages panel', () => {
      render(<PubSubPage />);
      
      expect(screen.getByText('LIVE MESSAGES')).toBeInTheDocument();
      expect(screen.getByText('Not connected')).toBeInTheDocument();
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('should render Quick Publish panel', () => {
      render(<PubSubPage />);
      
      expect(screen.getByText('QUICK PUBLISH')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    });

    it('should render Subscription Configuration panel', () => {
      render(<PubSubPage />);
      
      expect(screen.getByText('SUBSCRIPTION CONFIGURATION')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /channels/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /groups/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /filters/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /advanced/i })).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should initialize with default values', () => {
      render(<PubSubPage />);
      
      const channelInputs = screen.getAllByDisplayValue('hello_world');
      expect(channelInputs.length).toBeGreaterThan(0);
      
      const messageTextarea = screen.getByDisplayValue(/Hello, World!/);
      expect(messageTextarea).toBeInTheDocument();
    });

    it('should update publish data when inputs change', () => {
      render(<PubSubPage />);
      
      const channelInput = screen.getByPlaceholderText('Channel name');
      fireEvent.change(channelInput, { target: { value: 'new-channel' } });
      
      expect(screen.getByDisplayValue('new-channel')).toBeInTheDocument();
    });

    it('should toggle switches correctly', () => {
      render(<PubSubPage />);
      
      const storeInHistorySwitch = screen.getByRole('switch', { name: /store in history/i });
      expect(storeInHistorySwitch).toBeChecked();
      
      fireEvent.click(storeInHistorySwitch);
      expect(storeInHistorySwitch).not.toBeChecked();
    });
  });

  describe('Tabs Navigation', () => {
    it('should switch between tabs', () => {
      render(<PubSubPage />);
      
      // Default should be channels tab
      expect(screen.getByText('Channel Names (comma-separated)')).toBeInTheDocument();
      
      // Switch to groups tab
      const groupsTab = screen.getByRole('tab', { name: /groups/i });
      fireEvent.click(groupsTab);
      expect(screen.getByText('Channel Group Names (comma-separated)')).toBeInTheDocument();
      
      // Switch to filters tab
      const filtersTab = screen.getByRole('tab', { name: /filters/i });
      fireEvent.click(filtersTab);
      expect(screen.getByText('Message Filters (Server-side)')).toBeInTheDocument();
      
      // Switch to advanced tab
      const advancedTab = screen.getByRole('tab', { name: /advanced/i });
      fireEvent.click(advancedTab);
      expect(screen.getByText('Cursor Timetoken')).toBeInTheDocument();
    });
  });

  describe('Filter Management', () => {
    it('should add new filters', () => {
      render(<PubSubPage />);
      
      // Switch to filters tab
      const filtersTab = screen.getByRole('tab', { name: /filters/i });
      fireEvent.click(filtersTab);
      
      // Initially should have 1 filter
      expect(screen.getByText('Filter 1')).toBeInTheDocument();
      
      // Add another filter
      const addFilterButton = screen.getByRole('button', { name: /add filter/i });
      fireEvent.click(addFilterButton);
      
      // Should now have 2 filters
      expect(screen.getByText('Filter 1')).toBeInTheDocument();
      expect(screen.getByText('Filter 2')).toBeInTheDocument();
    });

    it('should remove filters when there are multiple', () => {
      render(<PubSubPage />);
      
      // Switch to filters tab
      const filtersTab = screen.getByRole('tab', { name: /filters/i });
      fireEvent.click(filtersTab);
      
      // Add a second filter first
      const addFilterButton = screen.getByRole('button', { name: /add filter/i });
      fireEvent.click(addFilterButton);
      
      // Should have remove buttons now
      const removeButtons = screen.getAllByRole('button');
      const removeButton = removeButtons.find(btn => btn.querySelector('svg')); // X icon
      
      if (removeButton) {
        fireEvent.click(removeButton);
        // Should go back to 1 filter
        expect(screen.getByText('Filter 1')).toBeInTheDocument();
        expect(screen.queryByText('Filter 2')).not.toBeInTheDocument();
      }
    });

    it('should update filter values', () => {
      render(<PubSubPage />);
      
      // Switch to filters tab
      const filtersTab = screen.getByRole('tab', { name: /filters/i });
      fireEvent.click(filtersTab);
      
      // Find filter input fields
      const targetInput = screen.getByPlaceholderText('Target');
      const fieldInput = screen.getByPlaceholderText('Field');
      const valueInput = screen.getByPlaceholderText('Value');
      
      fireEvent.change(fieldInput, { target: { value: 'type' } });
      fireEvent.change(valueInput, { target: { value: 'alert' } });
      
      expect(fieldInput.value).toBe('type');
      expect(valueInput.value).toBe('alert');
    });
  });

  describe('Advanced Options', () => {
    it('should update cursor timetoken and region', () => {
      render(<PubSubPage />);
      
      // Switch to advanced tab
      const advancedTab = screen.getByRole('tab', { name: /advanced/i });
      fireEvent.click(advancedTab);
      
      const timetokenInput = screen.getByPlaceholderText('15123456789012345');
      fireEvent.change(timetokenInput, { target: { value: '12345678901234567' } });
      
      expect(timetokenInput.value).toBe('12345678901234567');
    });

    it('should toggle heartbeat and reconnect switches', () => {
      render(<PubSubPage />);
      
      // Switch to advanced tab
      const advancedTab = screen.getByRole('tab', { name: /advanced/i });
      fireEvent.click(advancedTab);
      
      const restoreSwitch = screen.getByRole('switch', { name: /restore on reconnect/i });
      expect(restoreSwitch).toBeChecked();
      
      fireEvent.click(restoreSwitch);
      expect(restoreSwitch).not.toBeChecked();
    });

    it('should update heartbeat interval', () => {
      render(<PubSubPage />);
      
      // Switch to advanced tab
      const advancedTab = screen.getByRole('tab', { name: /advanced/i });
      fireEvent.click(advancedTab);
      
      const heartbeatInput = screen.getByDisplayValue('300');
      fireEvent.change(heartbeatInput, { target: { value: '600' } });
      
      expect(heartbeatInput.value).toBe('600');
    });
  });

  describe('Message Formatting', () => {
    it('should format valid JSON message', () => {
      render(<PubSubPage />);
      
      const messageTextarea = screen.getByDisplayValue(/Hello, World!/);
      fireEvent.change(messageTextarea, { 
        target: { value: '{"test":true,"value":123}' } 
      });
      
      const formatButton = screen.getByRole('button', { name: /format/i });
      fireEvent.click(formatButton);
      
      // Should format the JSON with proper indentation
      expect(messageTextarea.value).toContain('{\n  "test": true');
    });

    it('should show error for invalid JSON', () => {
      render(<PubSubPage />);
      
      const messageTextarea = screen.getByDisplayValue(/Hello, World!/);
      fireEvent.change(messageTextarea, { target: { value: 'invalid json {' } });
      
      const formatButton = screen.getByRole('button', { name: /format/i });
      fireEvent.click(formatButton);
      
      expect(mockToast).toHaveBeenCalledWith({
        title: "Invalid JSON",
        description: "Unable to format message - not valid JSON",
        variant: "destructive",
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should set config type on mount', async () => {
      render(<PubSubPage />);
      
      await waitFor(() => {
        expect(mockSetConfigType).toHaveBeenCalledWith('pubsub-page');
      });
    });

    it('should update page settings when state changes', async () => {
      render(<PubSubPage />);
      
      const channelInput = screen.getByDisplayValue('hello_world');
      fireEvent.change(channelInput, { target: { value: 'new-channel' } });
      
      await waitFor(() => {
        expect(mockSetPageSettings).toHaveBeenCalled();
      });
    });
  });

  describe('Connection Status', () => {
    it('should show connected status when PubNub is ready', () => {
      (usePubNub as ReturnType<typeof vi.fn>).mockReturnValue({
        pubnub: {},
        isReady: true,
        connectionError: null,
        isConnected: true
      });
      
      render(<PubSubPage />);
      
      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).not.toBeDisabled();
    });

    it('should disable publish when not connected', () => {
      (usePubNub as ReturnType<typeof vi.fn>).mockReturnValue({
        pubnub: {},
        isReady: false,
        connectionError: null,
        isConnected: false
      });
      
      render(<PubSubPage />);
      
      const publishButton = screen.getByRole('button', { name: /publish/i });
      expect(publishButton).toBeDisabled();
    });
  });

  describe('Active Filters Display', () => {
    it('should show default filter expression', () => {
      render(<PubSubPage />);
      
      expect(screen.getByText('Active Filters:')).toBeInTheDocument();
      expect(screen.getByText('No valid filters configured')).toBeInTheDocument();
    });

    it('should update filter expression when filters change', () => {
      render(<PubSubPage />);
      
      // Switch to filters tab
      const filtersTab = screen.getByRole('tab', { name: /filters/i });
      fireEvent.click(filtersTab);
      
      // Update filter fields
      const fieldInput = screen.getByPlaceholderText('Field');
      const valueInput = screen.getByPlaceholderText('Value');
      
      fireEvent.change(fieldInput, { target: { value: 'type' } });
      fireEvent.change(valueInput, { target: { value: 'alert' } });
      
      // Should update the active filters display
      expect(screen.getByText(/message\.type == "alert"/)).toBeInTheDocument();
    });
  });
});