const { test, expect } = require('@playwright/test');
const {
  readGa4Hits,
  openPolitics,
  openPoliticsWithPageView,
  expectPreConsentValues,
  expectAcceptedConsentValues,
} = require('./analytics-helpers');

// Close the context so service workers cannot interfere with the next reused context.
test.afterEach(async ({ context }) => {
  await context.close();
});

test('TC01.1 Verification of expected values before consent', async ({ page }) => {
  const { pageView } = await openPoliticsWithPageView(page);
  expectPreConsentValues(pageView);
});

test('TC01.2 Accept removes the consent overlay', async ({ page }) => {
  const banner = await openPolitics(page);
  await banner.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(banner, 'Consent overlay removed after Accept').toHaveCount(0);
});

test('TC01.3 The first GA4 hit after Accept has the updated consent values', async ({ page }) => {
  const { banner, pageView } = await openPoliticsWithPageView(page);
  expectPreConsentValues(pageView);
  const accept = banner.getByRole('button', { name: 'Accept', exact: true });

  // Check that the button is ready before starting the request wait.
  await accept.click({ trial: true });

  // Start listening before the real click so an immediate hit is captured.
  const [firstGa4Request] = await Promise.all([
    page.waitForRequest(
      (request) => readGa4Hits(request).length > 0,
      { timeout: 20_000 }
    ),
    accept.click(),
  ]);

  await expect(banner, 'Consent overlay removed after Accept').toHaveCount(0);

  const [firstGa4Hit] = readGa4Hits(firstGa4Request);

  expectAcceptedConsentValues(firstGa4Hit, 'on the first GA4 hit');
});