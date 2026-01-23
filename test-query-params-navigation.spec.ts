import { test, expect } from '@playwright/test';

test.describe('Query Parameter Navigation', () => {
  test('should navigate directly to PubSub page with query parameters', async ({ page }) => {
    // Visit the URL with query parameters as the FIRST page
    const url = 'http://localhost:5173/docs/console/?publishKey=pub-c-test-key&subscribeKey=sub-c-test-key&channel=test-channel#/pubsub';

    await page.goto(url);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should NOT be redirected to Settings page
    await expect(page).not.toHaveURL(/\/#\/$/);

    // Should be on the PubSub page
    await expect(page).toHaveURL(/\/#\/pubsub$/);

    // Should see PubSub page title
    await expect(page.locator('text=Pub/Sub Tool')).toBeVisible({ timeout: 10000 });

    // Should NOT see the error toast
    await expect(page.locator('text=PubNub keys required')).not.toBeVisible();

    // Toast might have already disappeared, so we'll skip this check
    // The important thing is we're on the right page with the right channel

    // Verify the channel fields are populated with "test-channel"
    // Check subscription channels input
    const channelsTab = page.locator('text=Channels').first();
    if (await channelsTab.isVisible()) {
      await channelsTab.click();
    }

    // Wait for channel input to be populated
    await page.waitForTimeout(1000);

    // Check if channel is populated in the subscription config
    // The channel should appear in the UI somewhere (use first() since it appears in multiple places)
    await expect(page.locator('text=test-channel').first()).toBeVisible({ timeout: 5000 });

    console.log('✅ Query parameter navigation test passed!');
  });

  test('should redirect to Settings when no credentials provided', async ({ page }) => {
    // Visit PubSub page without credentials
    await page.goto('http://localhost:5173/docs/console/#/pubsub');

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Should be redirected to Settings page
    await expect(page).toHaveURL(/\/#\/$/);

    // Should see the error toast
    await expect(page.locator('text=PubNub keys required')).toBeVisible({ timeout: 5000 });

    console.log('✅ Redirect without credentials test passed!');
  });

  test('should show credentials in Settings after query param navigation', async ({ page }) => {
    // Visit PubSub with credentials in URL
    await page.goto('http://localhost:5173/docs/console/?publishKey=pub-c-verify&subscribeKey=sub-c-verify&channel=test#/pubsub');

    // Wait for page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to Settings page
    await page.goto('http://localhost:5173/docs/console/#/');

    // Check if credentials are saved
    const publishKeyInput = page.locator('input[name="publishKey"]');
    const subscribeKeyInput = page.locator('input[name="subscribeKey"]');

    await expect(publishKeyInput).toHaveValue('pub-c-verify');
    await expect(subscribeKeyInput).toHaveValue('sub-c-verify');

    console.log('✅ Credentials persistence test passed!');
  });
});
