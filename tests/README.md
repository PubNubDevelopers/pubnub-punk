# PubNub Developer Tools Tests

This directory contains Playwright end-to-end tests for the PubNub Developer Tools application.

## Test Files

### `pubsub-subscribe-filters.spec.ts`
Tests the Subscribe Filters functionality in the Pub/Sub page, replicating the manual testing performed during development. This test verifies:

1. **Basic Filter Configuration**: Setting up metadata-based filters using wildcard patterns
2. **Message Filtering**: Ensuring only messages matching the filter criteria are received
3. **Filter Expression Generation**: Verifying correct server-side filter expressions
4. **Dynamic Reconfiguration**: Testing filter changes and subscription restart

#### Test Scenarios Covered:

**Test 1: Metadata Color Field Filtering with Wildcard Pattern (`bl*`)**
- Sets up subscription to channel "xyz" with filter `meta.color LIKE "bl*"`
- Publishes messages with different color metadata:
  - `{"color": "blue"}` ✅ (should match and be received)
  - `{"color": "red"}` ❌ (should be filtered out)
  - `{"color": "black"}` ✅ (should match and be received)
  - `{"color": "green"}` ❌ (should be filtered out)
- Verifies only 2 messages are received (blue and black)

**Test 2: Dynamic Filter Reconfiguration**
- Tests changing filter criteria from `meta.region LIKE "us*"` to `meta.type LIKE "urgent"`
- Verifies subscription restart applies new filter correctly
- Tests both matching and non-matching messages with new criteria

## Running Tests

### Prerequisites
Make sure the development server is running:
```bash
npm run dev
```

### Run All Tests
```bash
npm test
```

### Run Tests with UI (Interactive Mode)
```bash
npm run test:ui
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

### Run Specific Test File
```bash
npx playwright test tests/pubsub-subscribe-filters.spec.ts
```

### Run Tests in Headed Mode (Visible Browser)
```bash
npx playwright test --headed
```

## Test Configuration

The tests are configured in `playwright.config.ts` with the following settings:

- **Base URL**: `http://localhost:5173`
- **Browser**: Chromium (Chrome)
- **Web Server**: Automatically starts `npm run dev` before tests
- **Retry**: 2 retries on CI environments
- **Trace**: Collected on first retry for debugging

## Test Architecture

The tests use Playwright's page object model principles and include:

- **Page Navigation**: Direct routing to `/pubsub`
- **Element Interaction**: Form filling, button clicking, switch toggling
- **Assertion Strategies**: Content verification, element counting, timeout handling
- **Wait Strategies**: Explicit waits for dynamic content and real-time updates

## Real-Time Testing Considerations

Since these tests involve real-time messaging with PubNub:

1. **Timeouts**: Tests include appropriate timeouts for message delivery
2. **State Verification**: Multiple assertion points ensure message state consistency
3. **Cleanup**: Tests are designed to be independent and not interfere with each other
4. **Message Counting**: Careful tracking of received message counts to verify filtering

## Debugging

If tests fail:

1. **Run with UI**: `npm run test:ui` for interactive debugging
2. **Check Traces**: HTML reporter includes traces for failed tests
3. **Headed Mode**: `npx playwright test --headed` to see browser actions
4. **Screenshots**: Automatically captured on failure
5. **Console Logs**: Available in test reports for debugging

## Integration with CI/CD

The test configuration is CI/CD ready with:

- Automatic server startup
- Retry policies for flaky tests
- HTML reporting for test results
- Optimized for single-worker execution in CI environments