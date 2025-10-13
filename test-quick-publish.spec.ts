import { test, expect } from '@playwright/test';

test('Quick Publish Panel functionality', async ({ page }) => {
  // Navigate to the new PubSub page
  await page.goto('http://localhost:5173/pubsub-new');
  
  // Wait for the page to load
  await page.waitForSelector('text=QUICK PUBLISH', { timeout: 10000 });
  
  // Find the Quick Publish panel
  const quickPublishPanel = page.locator('text=QUICK PUBLISH').locator('..');
  
  // Fill in channel name
  await page.fill('input[placeholder="hello_world"]', 'test-channel');
  
  // Fill in message
  await page.fill('input[placeholder*="Hello, World"]', '{"test": "message"}');
  
  // Test Format button
  await page.click('button:has-text("Format")');
  
  // Test Advanced toggle
  await page.click('button:has-text("Advanced")');
  
  // Check if advanced options are visible
  await expect(page.locator('text=Custom Message Type')).toBeVisible();
  await expect(page.locator('text=TTL (Hours)')).toBeVisible();
  await expect(page.locator('text=Metadata (JSON)')).toBeVisible();
  
  // Fill in advanced options
  await page.fill('input[placeholder="text-message"]', 'test-type');
  await page.fill('input[placeholder="24"]', '12');
  await page.fill('textarea[placeholder*="source"]', '{"source": "test"}');
  
  // Toggle switches
  const storeInHistorySwitch = page.locator('text=Store in History').locator('..//button[role="switch"]');
  await storeInHistorySwitch.click();
  
  // Click publish button
  await page.click('button:has-text("PUBLISH")');
  
  // Wait for publish status to appear
  await page.waitForSelector('text=timetoken=', { timeout: 5000 });
  
  // Verify success indicator
  const statusIndicator = page.locator('.bg-green-500');
  await expect(statusIndicator).toBeVisible();
  
  console.log('✅ Quick Publish Panel test passed!');
});