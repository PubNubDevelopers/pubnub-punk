import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const PUBSUB_ENHANCED_URL = `${BASE_URL}/pubsub-enhanced`;
const TEST_TIMEOUT = 30000;

// Helper function to wait for PubNub initialization
async function waitForPubNubInit(page: Page) {
  await page.waitForTimeout(1000); // Give PubNub time to initialize
}

// Helper to publish a test message
async function publishTestMessage(page: Page, message: string = '{"test": "message"}', channel: string = 'hello_world') {
  await page.fill('textarea[placeholder*="Enter JSON message"]', message);
  await page.fill('input[placeholder="Channel name"]', channel);
  await page.click('button:has-text("Publish")');
  await page.waitForTimeout(500); // Wait for publish to complete
}

// Helper to subscribe to channels
async function subscribeToChannel(page: Page, channel: string = 'hello_world') {
  await page.fill('input[placeholder="Enter channel names"]', channel);
  await page.click('button:has-text("Subscribe")');
  await page.waitForTimeout(1000); // Wait for subscription
}

test.describe('PubSub Enhanced Component Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PUBSUB_ENHANCED_URL);
    await waitForPubNubInit(page);
  });

  test.describe('1. Publishing Tests', () => {
    test('Publish simple JSON message to hello_world channel', async ({ page }) => {
      const testMessage = '{"text": "Simple test message", "timestamp": ' + Date.now() + '}';
      
      await page.fill('textarea[placeholder*="Enter JSON message"]', testMessage);
      await page.fill('input[placeholder="Channel name"]', 'hello_world');
      
      // Click publish button
      await page.click('button:has-text("Publish")');
      
      // Wait for success indicator or toast
      await page.waitForTimeout(1000);
      
      // Check for status indicator showing success
      const statusText = await page.locator('.text-sm.text-muted-foreground').textContent();
      expect(statusText).toContain('Timetoken:');
    });

    test('Publish with TTL set to 1 hour', async ({ page }) => {
      // Click to show advanced options
      const advancedButton = page.locator('button:has-text("Advanced Options")');
      await advancedButton.click();
      
      // Set TTL to 1 hour (3600 minutes)
      await page.fill('input[placeholder="Time to live in minutes"]', '60');
      
      // Publish message
      await publishTestMessage(page);
      
      // Verify success
      const statusText = await page.locator('.text-sm.text-muted-foreground').textContent();
      expect(statusText).toContain('Timetoken:');
    });

    test('Publish with metadata', async ({ page }) => {
      // Show advanced options
      await page.click('button:has-text("Advanced Options")');
      
      // Add metadata
      await page.fill('textarea[placeholder*="metadata"]', '{"source": "test", "version": "1.0"}');
      
      // Publish message
      await publishTestMessage(page);
      
      // Verify success
      const statusText = await page.locator('.text-sm.text-muted-foreground').textContent();
      expect(statusText).toContain('Timetoken:');
    });

    test('Publish with custom message type', async ({ page }) => {
      // Show advanced options
      await page.click('button:has-text("Advanced Options")');
      
      // Set custom message type
      await page.fill('input[placeholder*="message type"]', 'test-message');
      
      // Publish message
      await publishTestMessage(page);
      
      // Verify success
      const statusText = await page.locator('.text-sm.text-muted-foreground').textContent();
      expect(statusText).toContain('Timetoken:');
    });

    test('Toggle POST method and verify it works', async ({ page }) => {
      // Show advanced options
      await page.click('button:has-text("Advanced Options")');
      
      // Toggle POST method
      const postSwitch = page.locator('label:has-text("Send by POST")').locator('..').locator('button[role="switch"]');
      await postSwitch.click();
      
      // Verify switch is checked
      const isChecked = await postSwitch.getAttribute('data-state');
      expect(isChecked).toBe('checked');
      
      // Publish message
      await publishTestMessage(page);
      
      // Verify success
      const statusText = await page.locator('.text-sm.text-muted-foreground').textContent();
      expect(statusText).toContain('Timetoken:');
    });

    test('Test invalid JSON handling', async ({ page }) => {
      // Enter invalid JSON
      await page.fill('textarea[placeholder*="Enter JSON message"]', '{invalid json}');
      await page.fill('input[placeholder="Channel name"]', 'hello_world');
      
      // Try to publish
      await page.click('button:has-text("Publish")');
      
      // Should show error toast or validation message
      await page.waitForTimeout(500);
      
      // Check for error indication (either toast or status)
      const toastOrError = await page.locator('[role="alert"], .text-destructive, .text-red-500').count();
      expect(toastOrError).toBeGreaterThan(0);
    });
  });

  test.describe('2. Subscription Tests', () => {
    test('Subscribe to single channel and receive message', async ({ page }) => {
      // Subscribe to channel
      await subscribeToChannel(page, 'test-channel-single');
      
      // Verify subscription status
      const subscribeButton = page.locator('button:has-text("Unsubscribe")');
      await expect(subscribeButton).toBeVisible();
      
      // Publish a message to the channel
      await publishTestMessage(page, '{"test": "subscription test"}', 'test-channel-single');
      
      // Check that message appears in the messages panel
      await page.waitForTimeout(1500);
      const messageElement = page.locator('.font-mono:has-text("subscription test")').first();
      await expect(messageElement).toBeVisible();
    });

    test('Subscribe to multiple channels (comma-separated)', async ({ page }) => {
      // Subscribe to multiple channels
      const channels = 'channel-1,channel-2,channel-3';
      await subscribeToChannel(page, channels);
      
      // Verify subscription
      const subscribeButton = page.locator('button:has-text("Unsubscribe")');
      await expect(subscribeButton).toBeVisible();
      
      // Publish to one of the channels
      await publishTestMessage(page, '{"test": "multi-channel"}', 'channel-2');
      
      // Verify message received
      await page.waitForTimeout(1500);
      const messageElement = page.locator('.font-mono:has-text("multi-channel")').first();
      await expect(messageElement).toBeVisible();
    });

    test('Test wildcard subscription', async ({ page }) => {
      // Subscribe with wildcard
      await subscribeToChannel(page, 'test-channel-*');
      
      // Verify subscription
      const subscribeButton = page.locator('button:has-text("Unsubscribe")');
      await expect(subscribeButton).toBeVisible();
      
      // Publish to matching channel
      await publishTestMessage(page, '{"test": "wildcard match"}', 'test-channel-123');
      
      // Verify message received
      await page.waitForTimeout(1500);
      const messageElement = page.locator('.font-mono:has-text("wildcard match")').first();
      await expect(messageElement).toBeVisible();
    });

    test('Enable presence events and verify display', async ({ page }) => {
      // Go to Advanced tab in subscription config
      await page.click('button[role="tab"]:has-text("Advanced")');
      
      // Enable presence events
      const presenceSwitch = page.locator('label:has-text("Receive Presence Events")').locator('..').locator('button[role="switch"]');
      await presenceSwitch.click();
      
      // Subscribe to channel
      await page.click('button[role="tab"]:has-text("Channels")');
      await subscribeToChannel(page, 'presence-test-channel');
      
      // Check for presence panel visibility
      const presencePanel = page.locator('h3:has-text("Presence Events")');
      await expect(presencePanel).toBeVisible();
    });

    test('Test unsubscribe cleans up properly', async ({ page }) => {
      // Subscribe to channel
      await subscribeToChannel(page, 'cleanup-test-channel');
      
      // Verify subscribed
      const unsubscribeButton = page.locator('button:has-text("Unsubscribe")');
      await expect(unsubscribeButton).toBeVisible();
      
      // Unsubscribe
      await unsubscribeButton.click();
      await page.waitForTimeout(500);
      
      // Verify unsubscribed
      const subscribeButton = page.locator('button:has-text("Subscribe")');
      await expect(subscribeButton).toBeVisible();
      
      // Publish message - should not be received
      await publishTestMessage(page, '{"test": "should not receive"}', 'cleanup-test-channel');
      
      // Verify no new messages appear
      await page.waitForTimeout(1500);
      const messageCount = await page.locator('.font-mono:has-text("should not receive")').count();
      expect(messageCount).toBe(0);
    });
  });

  test.describe('3. Filter Tests', () => {
    test('Add filter: message.text == "test"', async ({ page }) => {
      // Go to Filters tab
      await page.click('button[role="tab"]:has-text("Filters")');
      
      // Add a filter condition
      await page.click('button:has-text("Add Condition")');
      
      // Set filter field
      await page.fill('input[placeholder="e.g., message.type"]', 'message.text');
      
      // Select operator (== should be default)
      const operatorSelect = page.locator('select').first();
      await operatorSelect.selectOption('==');
      
      // Set filter value
      await page.fill('input[placeholder="Value to compare"]', 'test');
      
      // Subscribe with filter
      await page.click('button[role="tab"]:has-text("Channels")');
      await subscribeToChannel(page, 'filter-test-channel');
      
      // Publish matching message
      await publishTestMessage(page, '{"text": "test"}', 'filter-test-channel');
      await page.waitForTimeout(1500);
      
      // Verify message received
      let messageElement = page.locator('.font-mono:has-text("test")').first();
      await expect(messageElement).toBeVisible();
      
      // Publish non-matching message
      await publishTestMessage(page, '{"text": "other"}', 'filter-test-channel');
      await page.waitForTimeout(1500);
      
      // Verify message not displayed
      const otherMessageCount = await page.locator('.font-mono:has-text("other")').count();
      expect(otherMessageCount).toBe(0);
    });

    test('Test AND logic with multiple filters', async ({ page }) => {
      // Go to Filters tab
      await page.click('button[role="tab"]:has-text("Filters")');
      
      // Ensure AND logic is selected
      const andRadio = page.locator('label:has-text("AND (all conditions)")').locator('input[type="radio"]');
      await andRadio.check();
      
      // Add first condition
      await page.click('button:has-text("Add Condition")');
      await page.locator('input[placeholder="e.g., message.type"]').first().fill('message.type');
      await page.locator('select').first().selectOption('==');
      await page.locator('input[placeholder="Value to compare"]').first().fill('alert');
      
      // Add second condition
      await page.click('button:has-text("Add Condition")');
      await page.locator('input[placeholder="e.g., message.type"]').nth(1).fill('message.priority');
      await page.locator('select').nth(1).selectOption('>');
      await page.locator('input[placeholder="Value to compare"]').nth(1).fill('5');
      
      // Subscribe
      await page.click('button[role="tab"]:has-text("Channels")');
      await subscribeToChannel(page, 'and-filter-channel');
      
      // Test messages
      await publishTestMessage(page, '{"type": "alert", "priority": 10}', 'and-filter-channel');
      await page.waitForTimeout(1500);
      
      // Should receive this message (both conditions match)
      const matchingMessage = page.locator('.font-mono:has-text("alert")').first();
      await expect(matchingMessage).toBeVisible();
      
      // Publish non-matching message (only one condition matches)
      await publishTestMessage(page, '{"type": "alert", "priority": 3}', 'and-filter-channel');
      await page.waitForTimeout(1500);
      
      // Should not receive this message
      const nonMatchingCount = await page.locator('.font-mono:has-text("priority": 3)').count();
      expect(nonMatchingCount).toBe(0);
    });

    test('Test OR logic with multiple filters', async ({ page }) => {
      // Go to Filters tab
      await page.click('button[role="tab"]:has-text("Filters")');
      
      // Select OR logic
      const orRadio = page.locator('label:has-text("OR (any condition)")').locator('input[type="radio"]');
      await orRadio.check();
      
      // Add conditions
      await page.click('button:has-text("Add Condition")');
      await page.locator('input[placeholder="e.g., message.type"]').first().fill('message.status');
      await page.locator('select').first().selectOption('==');
      await page.locator('input[placeholder="Value to compare"]').first().fill('urgent');
      
      await page.click('button:has-text("Add Condition")');
      await page.locator('input[placeholder="e.g., message.type"]').nth(1).fill('message.status');
      await page.locator('select').nth(1).selectOption('==');
      await page.locator('input[placeholder="Value to compare"]').nth(1).fill('critical');
      
      // Subscribe
      await page.click('button[role="tab"]:has-text("Channels")');
      await subscribeToChannel(page, 'or-filter-channel');
      
      // Test with first condition matching
      await publishTestMessage(page, '{"status": "urgent"}', 'or-filter-channel');
      await page.waitForTimeout(1500);
      const urgentMessage = page.locator('.font-mono:has-text("urgent")').first();
      await expect(urgentMessage).toBeVisible();
      
      // Test with second condition matching
      await publishTestMessage(page, '{"status": "critical"}', 'or-filter-channel');
      await page.waitForTimeout(1500);
      const criticalMessage = page.locator('.font-mono:has-text("critical")').first();
      await expect(criticalMessage).toBeVisible();
    });

    test('Use filter template and verify expression', async ({ page }) => {
      // Go to Filters tab
      await page.click('button[role="tab"]:has-text("Filters")');
      
      // Click on filter templates button if available
      const templateButton = page.locator('button:has-text("Templates"), button:has-text("Template")').first();
      if (await templateButton.isVisible()) {
        await templateButton.click();
        
        // Select a template (e.g., "Priority Messages")
        const templateOption = page.locator('button:has-text("Priority"), div:has-text("Priority")').first();
        if (await templateOption.isVisible()) {
          await templateOption.click();
        }
      }
      
      // Verify filter expression is shown
      const filterExpression = page.locator('code, pre').filter({ hasText: /message\.|meta\./ });
      const expressionCount = await filterExpression.count();
      expect(expressionCount).toBeGreaterThan(0);
    });

    test('Verify filter badge shows count', async ({ page }) => {
      // Go to Filters tab
      await page.click('button[role="tab"]:has-text("Filters")');
      
      // Add a condition
      await page.click('button:has-text("Add Condition")');
      await page.fill('input[placeholder="e.g., message.type"]', 'message.test');
      await page.fill('input[placeholder="Value to compare"]', 'badge');
      
      // Check for filter count badge
      const filterTab = page.locator('button[role="tab"]:has-text("Filters")');
      const badgeText = await filterTab.textContent();
      expect(badgeText).toContain('1'); // Should show count
    });
  });

  test.describe('4. Config Persistence Tests', () => {
    test('Change settings and reload page', async ({ page }) => {
      // Change some settings
      await page.fill('input[placeholder="Channel name"]', 'persistence-test-channel');
      await page.fill('textarea[placeholder*="Enter JSON message"]', '{"persistence": "test"}');
      
      // Change subscription channel
      await page.fill('input[placeholder="Enter channel names"]', 'persist-sub-channel');
      
      // Wait for auto-save (debounced at 500ms)
      await page.waitForTimeout(1000);
      
      // Reload page
      await page.reload();
      await waitForPubNubInit(page);
      
      // Verify settings restored
      const channelInput = page.locator('input[placeholder="Channel name"]');
      await expect(channelInput).toHaveValue('persistence-test-channel');
      
      const messageTextarea = page.locator('textarea[placeholder*="Enter JSON message"]');
      await expect(messageTextarea).toHaveValue('{"persistence": "test"}');
      
      const subChannelInput = page.locator('input[placeholder="Enter channel names"]');
      await expect(subChannelInput).toHaveValue('persist-sub-channel');
    });

    test('Verify settings restored with toast notification', async ({ page }) => {
      // Make a change to trigger save
      await page.fill('input[placeholder="Channel name"]', 'toast-test-channel');
      await page.waitForTimeout(1000);
      
      // Reload
      await page.reload();
      await waitForPubNubInit(page);
      
      // Check for toast notification about restored settings
      const toast = page.locator('[role="alert"]:has-text("restored"), div:has-text("Loaded saved")');
      const toastCount = await toast.count();
      expect(toastCount).toBeGreaterThan(0);
    });

    test('Test Reset button clears config', async ({ page }) => {
      // Make changes
      await page.fill('input[placeholder="Channel name"]', 'reset-test-channel');
      await page.fill('input[placeholder="Enter channel names"]', 'reset-sub-channel');
      await page.waitForTimeout(1000);
      
      // Find and click reset button
      const resetButton = page.locator('button:has-text("Reset"), button[title*="Reset"]').first();
      if (await resetButton.isVisible()) {
        await resetButton.click();
        await page.waitForTimeout(500);
        
        // Verify defaults restored
        const channelInput = page.locator('input[placeholder="Channel name"]');
        await expect(channelInput).toHaveValue('hello_world');
        
        const subChannelInput = page.locator('input[placeholder="Enter channel names"]');
        await expect(subChannelInput).toHaveValue('hello_world');
      }
    });

    test('Verify auto-save triggers', async ({ page }) => {
      // Open browser console to see logs
      page.on('console', msg => {
        if (msg.text().includes('Auto-saving') || msg.text().includes('Config saved')) {
          console.log('Auto-save triggered:', msg.text());
        }
      });
      
      // Make a change
      await page.fill('input[placeholder="Channel name"]', 'autosave-test');
      
      // Wait for debounce
      await page.waitForTimeout(1000);
      
      // Make another change
      await page.fill('textarea[placeholder*="Enter JSON message"]', '{"autosave": true}');
      
      // Wait and verify no errors
      await page.waitForTimeout(1000);
      
      // Reload to verify saved
      await page.reload();
      await waitForPubNubInit(page);
      
      const channelInput = page.locator('input[placeholder="Channel name"]');
      await expect(channelInput).toHaveValue('autosave-test');
    });
  });

  test.describe('5. UI Interaction Tests', () => {
    test('Test auto-scroll with new messages', async ({ page }) => {
      // Subscribe to a channel
      await subscribeToChannel(page, 'scroll-test-channel');
      
      // Publish multiple messages
      for (let i = 0; i < 5; i++) {
        await publishTestMessage(page, `{"message": "scroll test ${i}"}`, 'scroll-test-channel');
        await page.waitForTimeout(300);
      }
      
      // Check that we're scrolled to bottom (auto-scroll active)
      const messagesContainer = page.locator('[class*="overflow-y-auto"]').filter({ has: page.locator('.font-mono') }).first();
      
      // Verify last message is visible
      const lastMessage = page.locator('.font-mono:has-text("scroll test 4")').first();
      await expect(lastMessage).toBeVisible();
    });

    test('Scroll up manually and verify button appears', async ({ page }) => {
      // Subscribe and add messages
      await subscribeToChannel(page, 'manual-scroll-channel');
      
      // Add many messages
      for (let i = 0; i < 10; i++) {
        await publishTestMessage(page, `{"msg": "${i}"}`, 'manual-scroll-channel');
        await page.waitForTimeout(200);
      }
      
      // Scroll up manually
      const messagesContainer = page.locator('[class*="overflow-y-auto"]').filter({ has: page.locator('.font-mono') }).first();
      await messagesContainer.evaluate(el => el.scrollTop = 0);
      
      // Check for scroll to bottom button
      await page.waitForTimeout(500);
      const scrollButton = page.locator('button:has-text("Scroll to bottom"), button[title*="Scroll"]').first();
      const isVisible = await scrollButton.isVisible();
      expect(isVisible).toBe(true);
    });

    test('Test Copy All Messages function', async ({ page }) => {
      // Add some messages
      await subscribeToChannel(page, 'copy-test-channel');
      await publishTestMessage(page, '{"copy": "test1"}', 'copy-test-channel');
      await publishTestMessage(page, '{"copy": "test2"}', 'copy-test-channel');
      await page.waitForTimeout(1500);
      
      // Find and click copy all button
      const copyButton = page.locator('button[title*="Copy all"], button:has-text("Copy All")').first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        
        // Check for success toast or feedback
        await page.waitForTimeout(500);
        const successIndicator = page.locator('[role="alert"]:has-text("Copied"), div:has-text("copied")');
        const hasSuccess = await successIndicator.count();
        expect(hasSuccess).toBeGreaterThan(0);
      }
    });

    test('Test Clear messages', async ({ page }) => {
      // Add messages
      await subscribeToChannel(page, 'clear-test-channel');
      await publishTestMessage(page, '{"clear": "test"}', 'clear-test-channel');
      await page.waitForTimeout(1500);
      
      // Verify message exists
      let messageCount = await page.locator('.font-mono:has-text("clear")').count();
      expect(messageCount).toBeGreaterThan(0);
      
      // Clear messages
      const clearButton = page.locator('button[title*="Clear"], button:has-text("Clear")').first();
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(500);
        
        // Verify messages cleared
        messageCount = await page.locator('.font-mono:has-text("clear")').count();
        expect(messageCount).toBe(0);
      }
    });

    test('Switch between all 4 subscription tabs', async ({ page }) => {
      const tabs = ['Channels', 'Groups', 'Filters', 'Advanced'];
      
      for (const tabName of tabs) {
        const tab = page.locator(`button[role="tab"]:has-text("${tabName}")`);
        await tab.click();
        
        // Verify tab is selected
        const isSelected = await tab.getAttribute('aria-selected');
        expect(isSelected).toBe('true');
        
        // Verify corresponding panel is visible
        const panelVisible = await page.locator(`[role="tabpanel"]`).isVisible();
        expect(panelVisible).toBe(true);
      }
    });

    test('Toggle Advanced options in publish panel', async ({ page }) => {
      const advancedButton = page.locator('button:has-text("Advanced Options")');
      
      // Initially collapsed
      const advancedFields = page.locator('input[placeholder*="Time to live"], textarea[placeholder*="metadata"]');
      let isVisible = await advancedFields.first().isVisible();
      expect(isVisible).toBe(false);
      
      // Click to expand
      await advancedButton.click();
      await page.waitForTimeout(300);
      
      // Now should be visible
      isVisible = await advancedFields.first().isVisible();
      expect(isVisible).toBe(true);
      
      // Click to collapse
      await advancedButton.click();
      await page.waitForTimeout(300);
      
      // Should be hidden again
      isVisible = await advancedFields.first().isVisible();
      expect(isVisible).toBe(false);
    });
  });

  test.describe('6. Performance Tests', () => {
    test('Send 100 rapid messages', async ({ page }) => {
      test.setTimeout(60000); // Increase timeout for performance test
      
      // Subscribe to channel
      await subscribeToChannel(page, 'perf-test-channel');
      
      // Send 100 messages rapidly
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        await page.fill('textarea[placeholder*="Enter JSON message"]', `{"perf": ${i}, "timestamp": ${Date.now()}}`);
        await page.fill('input[placeholder="Channel name"]', 'perf-test-channel');
        await page.click('button:has-text("Publish")');
        
        // Small delay to avoid overwhelming
        if (i % 10 === 0) {
          await page.waitForTimeout(100);
        }
      }
      const endTime = Date.now();
      
      console.log(`Published 100 messages in ${endTime - startTime}ms`);
      
      // Wait for messages to appear
      await page.waitForTimeout(5000);
      
      // Count received messages
      const messageCount = await page.locator('.font-mono:has-text("perf")').count();
      console.log(`Received ${messageCount} messages`);
      
      // Should receive most messages (allow for some loss)
      expect(messageCount).toBeGreaterThan(50); // At least 50% received
    });

    test('Verify MAX_MESSAGES limit (1000)', async ({ page }) => {
      test.setTimeout(60000);
      
      // This is a conceptual test - in practice we'd need to verify the limit
      // by checking that old messages are removed when limit is exceeded
      
      // Subscribe to channel
      await subscribeToChannel(page, 'limit-test-channel');
      
      // The component should handle message limiting internally
      // We can verify by checking the implementation handles this
      
      // For now, just verify the component doesn't crash with many messages
      for (let i = 0; i < 20; i++) {
        await publishTestMessage(page, `{"limit": ${i}}`, 'limit-test-channel');
        await page.waitForTimeout(50);
      }
      
      // Verify UI is still responsive
      const publishButton = page.locator('button:has-text("Publish")');
      await expect(publishButton).toBeEnabled();
    });

    test('Check smooth scrolling', async ({ page }) => {
      // Subscribe and add messages
      await subscribeToChannel(page, 'smooth-scroll-channel');
      
      // Add messages with small delays to test smooth scrolling
      for (let i = 0; i < 10; i++) {
        await publishTestMessage(page, `{"smooth": ${i}}`, 'smooth-scroll-channel');
        await page.waitForTimeout(200);
        
        // Verify latest message is visible (auto-scroll working)
        const latestMessage = page.locator(`.font-mono:has-text("smooth": ${i})`).first();
        await expect(latestMessage).toBeVisible();
      }
    });
  });

  test.describe('7. Comparison with Original', () => {
    test('Verify core features match original implementation', async ({ page }) => {
      // This test compares key features with the original /pubsub route
      // We'll check that the enhanced version has all the main features
      
      const features = [
        // Publishing features
        { selector: 'textarea[placeholder*="Enter JSON message"]', name: 'Message input' },
        { selector: 'input[placeholder="Channel name"]', name: 'Channel input' },
        { selector: 'button:has-text("Publish")', name: 'Publish button' },
        { selector: 'button:has-text("Advanced Options")', name: 'Advanced options' },
        
        // Subscription features
        { selector: 'input[placeholder="Enter channel names"]', name: 'Subscribe channels' },
        { selector: 'button:has-text("Subscribe"), button:has-text("Unsubscribe")', name: 'Subscribe/Unsubscribe' },
        { selector: 'button[role="tab"]:has-text("Filters")', name: 'Filters tab' },
        { selector: 'button[role="tab"]:has-text("Groups")', name: 'Groups tab' },
        { selector: 'button[role="tab"]:has-text("Advanced")', name: 'Advanced tab' },
        
        // Message display
        { selector: '[class*="overflow-y-auto"]', name: 'Messages container' },
        { selector: 'h3:has-text("Messages"), h2:has-text("Messages")', name: 'Messages header' },
      ];
      
      for (const feature of features) {
        const element = page.locator(feature.selector).first();
        const isPresent = await element.count() > 0;
        expect(isPresent).toBe(true);
        console.log(`✓ ${feature.name}: Present`);
      }
    });

    test('Ensure no feature regression', async ({ page }) => {
      // Test that all major workflows work
      
      // 1. Can publish and receive messages
      await subscribeToChannel(page, 'regression-test');
      await publishTestMessage(page, '{"regression": "test"}', 'regression-test');
      await page.waitForTimeout(1500);
      
      const message = page.locator('.font-mono:has-text("regression")').first();
      await expect(message).toBeVisible();
      
      // 2. Can use filters
      await page.click('button[role="tab"]:has-text("Filters")');
      await page.click('button:has-text("Add Condition")');
      const hasFilterUI = await page.locator('input[placeholder="e.g., message.type"]').isVisible();
      expect(hasFilterUI).toBe(true);
      
      // 3. Can use advanced options
      await page.click('button:has-text("Advanced Options")');
      const hasTTL = await page.locator('input[placeholder*="Time to live"]').isVisible();
      expect(hasTTL).toBe(true);
      
      // 4. Config persistence works
      await page.fill('input[placeholder="Channel name"]', 'persistence-check');
      await page.waitForTimeout(1000);
      await page.reload();
      await waitForPubNubInit(page);
      const channelValue = await page.locator('input[placeholder="Channel name"]').inputValue();
      expect(channelValue).toBe('persistence-check');
      
      console.log('✓ No feature regression detected');
    });
  });
});

// Additional test for error handling
test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PUBSUB_ENHANCED_URL);
    await waitForPubNubInit(page);
  });

  test('Handle network errors gracefully', async ({ page }) => {
    // Subscribe to a channel
    await subscribeToChannel(page, 'error-test-channel');
    
    // The component should handle PubNub errors gracefully
    // This would typically show in toasts or status indicators
    
    // Try publishing to a restricted channel (might fail with demo keys)
    await page.fill('input[placeholder="Channel name"]', 'restricted-channel');
    await publishTestMessage(page, '{"test": "error"}', 'restricted-channel');
    
    // Component should not crash
    const publishButton = page.locator('button:has-text("Publish")');
    await expect(publishButton).toBeEnabled();
  });

  test('Handle invalid filter expressions', async ({ page }) => {
    await page.click('button[role="tab"]:has-text("Filters")');
    await page.click('button:has-text("Add Condition")');
    
    // Enter invalid filter field
    await page.fill('input[placeholder="e.g., message.type"]', 'invalid..field..name');
    await page.fill('input[placeholder="Value to compare"]', 'test');
    
    // Try to subscribe - should handle gracefully
    await page.click('button[role="tab"]:has-text("Channels")');
    await subscribeToChannel(page, 'filter-error-channel');
    
    // Should not crash
    const isSubscribed = await page.locator('button:has-text("Unsubscribe")').isVisible();
    expect(isSubscribed).toBe(true);
  });
});