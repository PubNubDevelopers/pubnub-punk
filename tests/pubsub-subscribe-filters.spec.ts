import { test, expect } from '@playwright/test';

// Helper function to configure PubNub settings
async function configurePubNubSettings(page: any) {
  // Navigate to settings page
  await page.goto('/');
  
  // Wait for settings page to load
  await expect(page.locator('h2')).toContainText('Settings');
  
  // Configure Publish Key
  const publishKeyInput = page.getByRole('textbox', { name: 'Publish Key' });
  await publishKeyInput.clear();
  await publishKeyInput.fill('pub-c-17c0aef0-b03b-460f-8f93-69fa5d80034a');
  
  // Configure Subscribe Key
  const subscribeKeyInput = page.getByRole('textbox', { name: 'Subscribe Key' });
  await subscribeKeyInput.clear();
  await subscribeKeyInput.fill('sub-c-f18d5abb-122f-4ca0-9031-64e002e0fad0');
  
  // Configure User ID
  const userIdInput = page.getByRole('textbox', { name: 'User ID' });
  await userIdInput.clear();
  await userIdInput.fill('test-user-filters');
  
  // Ensure Origin is set to default (ps.pndsn.com)
  const originCombobox = page.getByRole('combobox', { name: 'Origin' });
  // Check if it's already set to default, if not, change it
  const currentOriginText = await originCombobox.textContent();
  if (!currentOriginText?.includes('ps.pndsn.com (Default)')) {
    await originCombobox.click();
    // Wait for dropdown to open and select the default option
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').filter({ hasText: 'ps.pndsn.com (Default)' }).first().click();
  }
  
  // Save configuration
  const saveButton = page.getByRole('button', { name: 'Save Configuration' });
  await saveButton.click();
  
  // Wait for settings to be saved (should be immediate)
  await page.waitForTimeout(500);
}

test.describe('PubNub Subscribe Filters', () => {
  test('should filter messages based on metadata color field with wildcard pattern', async ({ page }) => {
    // Set timeout to 10 seconds - PubNub should respond within milliseconds
    test.setTimeout(10000);
    // First configure PubNub settings
    await configurePubNubSettings(page);
    
    // Navigate to the pubsub page
    await page.goto('/pubsub');
    
    // Wait for the page to load and ensure PubNub connection is ready
    await expect(page.locator('h2')).toContainText('Pub/Sub Tool');
    
    // Set up subscription to channel "xyz"
    const channelsInput = page.getByRole('textbox', { name: 'Channels' });
    await channelsInput.clear();
    await channelsInput.fill('xyz');
    
    // Open Subscribe Filters section
    const filtersButton = page.getByRole('button', { name: 'Subscribe Filters' });
    await filtersButton.click();
    
    // Wait for the filters section to expand and be visible
    await expect(page.locator('text=Configure server-side message filtering')).toBeVisible();
    
    // Configure the filter: meta.color LIKE "bl*"
    // First set the Target to Metadata
    const targetCombobox = page.getByRole('combobox').first(); // Target dropdown
    await targetCombobox.click();
    // Be more specific to avoid strict mode violation
    await page.locator('[role="option"]').filter({ hasText: 'Metadata' }).first().click();
    
    // Set the Field to "color" - locate by position in the filter section
    const fieldInput = page.locator('text=Field').locator('..').locator('input');
    await fieldInput.waitFor({ state: 'visible' });
    await fieldInput.fill('color');
    
    // Set the Operator to "Like (wildcard)" - locate by position in filter section
    const operatorCombobox = page.locator('text=Operator').locator('..').locator('[role="combobox"]');
    await operatorCombobox.waitFor({ state: 'visible' });
    await operatorCombobox.click();
    // Be more specific to avoid strict mode violation
    await page.locator('[role="option"]').filter({ hasText: 'Like (wildcard)' }).first().click();
    
    // Set the Value to "bl*" - locate by position in the filter section
    const valueInput = page.locator('text=Value').locator('..').locator('input');
    await valueInput.waitFor({ state: 'visible' });
    await valueInput.fill('bl*');
    
    // Verify the generated filter expression
    await expect(page.locator('code')).toContainText('meta.color LIKE "bl*"');
    
    // Ensure subscription is active - use direct switch selector
    const subscriptionSwitch = page.locator('[role="switch"]').last(); // Last switch on the page should be the subscription switch
    await subscriptionSwitch.waitFor({ state: 'visible' });
    const isChecked = await subscriptionSwitch.isChecked();
    if (!isChecked) {
      await subscriptionSwitch.click();
    }
    
    // Wait for subscription to be established
    await expect(page.locator('text=Receiving messages')).toBeVisible();
    
    // Set publish channel to "xyz"
    const publishChannelInput = page.getByRole('textbox', { name: 'Channel *' });
    await publishChannelInput.clear();
    await publishChannelInput.fill('xyz');
    
    // Test 1: Publish message with "blue" metadata (should match "bl*")
    const metaInput = page.getByRole('textbox', { name: 'Meta (Optional)' });
    await metaInput.fill('{"color": "blue"}');
    
    await page.getByRole('button', { name: 'Publish Message' }).click();
    
    // Wait for the message to be received
    await expect(page.locator('text=1 message received')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=1 received')).toBeVisible();
    
    // Test 2: Publish message with "red" metadata (should NOT match "bl*")
    await metaInput.clear();
    await metaInput.fill('{"color": "red"}');
    
    await page.getByRole('button', { name: 'Publish Message' }).click();
    
    // Wait a moment to ensure message would be received if it wasn't filtered
    await page.waitForTimeout(1000);
    
    // Verify the message count is still 1 (red message was filtered out)
    await expect(page.locator('text=1 message received')).toBeVisible();
    await expect(page.locator('text=1 received')).toBeVisible();
    
    // Test 3: Publish message with "black" metadata (should match "bl*")
    await metaInput.clear();
    await metaInput.fill('{"color": "black"}');
    
    await page.getByRole('button', { name: 'Publish Message' }).click();
    
    // Wait for the second matching message to be received
    await expect(page.locator('text=2 messages received')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=2 received')).toBeVisible();
    
    // Verify both messages are displayed in the message list
    const messageList = page.locator('[data-testid="message-list"], .message-list').first();
    if (await messageList.count() === 0) {
      // Fallback: look for message containers
      await expect(page.locator('text="#xyz"')).toHaveCount(2);
    } else {
      await expect(messageList.locator('text="#xyz"')).toHaveCount(2);
    }
    
    // Test 4: Publish message with "green" metadata (should NOT match "bl*")
    await metaInput.clear();
    await metaInput.fill('{"color": "green"}');
    
    await page.getByRole('button', { name: 'Publish Message' }).click();
    
    // Wait a moment to ensure message would be received if it wasn't filtered
    await page.waitForTimeout(1000);
    
    // Verify the message count is still 2 (green message was filtered out)
    await expect(page.locator('text=2 messages received')).toBeVisible();
    await expect(page.locator('text=2 received')).toBeVisible();
    
    // Final verification: Only messages with colors starting with "bl" were received
    // We should have 2 messages total (blue and black), not 4
    const finalMessageCount = await page.locator('text="#xyz"').count();
    expect(finalMessageCount).toBe(2);
  });
  
  test('should allow dynamic filter configuration and restart subscription', async ({ page }) => {
    // Set timeout to 10 seconds - PubNub should respond within milliseconds
    test.setTimeout(10000);
    // First configure PubNub settings
    await configurePubNubSettings(page);
    
    // Navigate to the pubsub page
    await page.goto('/pubsub');
    
    // Wait for the page to load
    await expect(page.locator('h2')).toContainText('Pub/Sub Tool');
    
    // Set up subscription to channel "test-filters"
    const channelsInput = page.getByRole('textbox', { name: 'Channels' });
    await channelsInput.clear();
    await channelsInput.fill('test-filters');
    
    // Open Subscribe Filters section
    const filtersButton = page.getByRole('button', { name: 'Subscribe Filters' });
    await filtersButton.click();
    
    // Wait for the filters section to expand and be visible
    await expect(page.locator('text=Configure server-side message filtering')).toBeVisible();
    
    // Configure initial filter: meta.region LIKE "us*"
    // First set the Target to Metadata
    const targetCombobox = page.getByRole('combobox').first(); // Target dropdown
    await targetCombobox.click();
    // Be more specific to avoid strict mode violation
    await page.locator('[role="option"]').filter({ hasText: 'Metadata' }).first().click();
    
    // Set the Field to "region" - locate by position in the filter section
    const fieldInput = page.locator('text=Field').locator('..').locator('input');
    await fieldInput.waitFor({ state: 'visible' });
    await fieldInput.fill('region');
    
    // Set the Operator to "Like (wildcard)" - locate by position in filter section
    const operatorCombobox = page.locator('text=Operator').locator('..').locator('[role="combobox"]');
    await operatorCombobox.waitFor({ state: 'visible' });
    await operatorCombobox.click();
    // Be more specific to avoid strict mode violation
    await page.locator('[role="option"]').filter({ hasText: 'Like (wildcard)' }).first().click();
    
    // Set the Value to "us*" - locate by position in the filter section
    const valueInput = page.locator('text=Value').locator('..').locator('input');
    await valueInput.waitFor({ state: 'visible' });
    await valueInput.fill('us*');
    
    // Verify the generated filter expression
    await expect(page.locator('code')).toContainText('meta.region LIKE "us*"');
    
    // Start subscription - use direct switch selector
    const subscriptionSwitch = page.locator('[role="switch"]').last(); // Last switch on the page should be the subscription switch
    await subscriptionSwitch.waitFor({ state: 'visible' });
    const isChecked = await subscriptionSwitch.isChecked();
    if (!isChecked) {
      await subscriptionSwitch.click();
    }
    
    await expect(page.locator('text=Receiving messages')).toBeVisible();
    
    // Set publish channel
    const publishChannelInput = page.getByRole('textbox', { name: 'Channel *' });
    await publishChannelInput.clear();
    await publishChannelInput.fill('test-filters');
    
    // Test with matching metadata
    const metaInput = page.getByRole('textbox', { name: 'Meta (Optional)' });
    await metaInput.fill('{"region": "us-east"}');
    
    await page.getByRole('button', { name: 'Publish Message' }).click();
    
    // Verify message is received
    await expect(page.locator('text=1 message received')).toBeVisible({ timeout: 5000 });
    
    // Now change the filter to test dynamic reconfiguration
    await fieldInput.clear();
    await fieldInput.fill('type');
    
    await valueInput.clear();
    await valueInput.fill('urgent');
    
    // Verify the filter expression updated
    await expect(page.locator('code')).toContainText('meta.type LIKE "urgent"');
    
    // Restart subscription to apply new filter
    await subscriptionSwitch.click(); // Stop
    await page.waitForTimeout(500);
    await subscriptionSwitch.click(); // Start with new filter
    
    await expect(page.locator('text=Receiving messages')).toBeVisible();
    
    // Clear previous messages for cleaner testing
    const clearButton = page.getByRole('button', { name: 'Clear Messages' });
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
    
    // Test with new filter criteria
    await metaInput.clear();
    await metaInput.fill('{"type": "urgent-alert"}');
    
    await page.getByRole('button', { name: 'Publish Message' }).click();
    
    // Verify message with new filter is received
    await expect(page.locator('text=1 message received')).toBeVisible({ timeout: 2000 });
    
    // Test with non-matching metadata
    await metaInput.clear();
    await metaInput.fill('{"type": "normal"}');
    
    await page.getByRole('button', { name: 'Publish Message' }).click();
    
    // Wait and verify the message count didn't increase (filtered out)
    await page.waitForTimeout(2000);
    await expect(page.locator('text=1 message received')).toBeVisible();
  });
});
