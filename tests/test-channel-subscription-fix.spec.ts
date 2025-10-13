import { test, expect } from '@playwright/test';

test.describe('PubSub Channel Subscription Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the PubSub page
    await page.goto('http://localhost:5174/pubsub');
    
    // Wait for the page to fully load
    await page.waitForSelector('[data-testid="subscription-config"]', { timeout: 10000 });
  });

  test('should receive messages on new channel after changing subscription config without manual disconnect/reconnect', async ({ page }) => {
    // Step 1: Set up initial subscription to a test channel
    const initialChannel = 'test_channel_initial_' + Date.now();
    
    // Navigate to channels tab and set initial channel
    await page.click('text=CHANNELS');
    const channelInput = page.locator('input[placeholder*="channel"]').first();
    await channelInput.clear();
    await channelInput.fill(initialChannel);
    
    // Enable the subscription
    await page.click('[role="switch"]');
    await expect(page.locator('text=ON')).toBeVisible();
    
    // Step 2: Publish a message to the initial channel
    const publishChannelInput = page.locator('input[placeholder*="Channel"]').first();
    await publishChannelInput.clear();
    await publishChannelInput.fill(initialChannel);
    
    const messageInput = page.locator('textarea[placeholder*="message"]').first();
    await messageInput.clear();
    await messageInput.fill('{"text": "Initial channel message", "timestamp": ' + Date.now() + '}');
    
    await page.click('button:has-text("PUBLISH")');
    
    // Verify message appears in the messages panel
    await expect(page.locator('text=Initial channel message')).toBeVisible({ timeout: 5000 });
    
    // Step 3: Change to a new channel (this is where the bug was)
    const newChannel = 'test_channel_new_' + Date.now();
    
    // Go back to subscription config and change channel
    await page.click('text=CHANNELS');
    await channelInput.clear();
    await channelInput.fill(newChannel);
    
    // Wait a moment for the subscription to update
    await page.waitForTimeout(1000);
    
    // Step 4: Publish a message to the new channel
    await publishChannelInput.clear();
    await publishChannelInput.fill(newChannel);
    
    await messageInput.clear();
    await messageInput.fill('{"text": "New channel message", "timestamp": ' + Date.now() + '}');
    
    await page.click('button:has-text("PUBLISH")');
    
    // Step 5: Verify the message appears without manual reconnection
    // This is the key test - if the bug is fixed, this message should appear
    await expect(page.locator('text=New channel message')).toBeVisible({ timeout: 5000 });
    
    // Verify subscription is still active (status should still show ON)
    await expect(page.locator('text=ON')).toBeVisible();
  });

  test('should update subscription when adding multiple channels', async ({ page }) => {
    // Step 1: Set up initial subscription to one channel
    const channel1 = 'test_channel_1_' + Date.now();
    
    await page.click('text=CHANNELS');
    const channelInput = page.locator('input[placeholder*="channel"]').first();
    await channelInput.clear();
    await channelInput.fill(channel1);
    
    // Enable subscription
    await page.click('[role="switch"]');
    await expect(page.locator('text=ON')).toBeVisible();
    
    // Step 2: Add a second channel to the subscription
    const channel2 = 'test_channel_2_' + Date.now();
    await channelInput.clear();
    await channelInput.fill(`${channel1},${channel2}`);
    
    // Wait for resubscription
    await page.waitForTimeout(1000);
    
    // Step 3: Test that both channels receive messages
    const publishChannelInput = page.locator('input[placeholder*="Channel"]').first();
    const messageInput = page.locator('textarea[placeholder*="message"]').first();
    
    // Test channel 1
    await publishChannelInput.clear();
    await publishChannelInput.fill(channel1);
    await messageInput.clear();
    await messageInput.fill('{"text": "Message to channel 1", "timestamp": ' + Date.now() + '}');
    await page.click('button:has-text("PUBLISH")');
    await expect(page.locator('text=Message to channel 1')).toBeVisible({ timeout: 5000 });
    
    // Test channel 2
    await publishChannelInput.clear();
    await publishChannelInput.fill(channel2);
    await messageInput.clear();
    await messageInput.fill('{"text": "Message to channel 2", "timestamp": ' + Date.now() + '}');
    await page.click('button:has-text("PUBLISH")');
    await expect(page.locator('text=Message to channel 2')).toBeVisible({ timeout: 5000 });
  });
});