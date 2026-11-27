const { test, expect } = require('@playwright/test');
const {
  politicsUrl,
  hitPageUrl,
  openPoliticsWithPageView,
  expectPreConsentValues,
} = require('./analytics-helpers');

// Close the context so service workers cannot interfere with the next reused context.
test.afterEach(async ({ context }) => {
  await context.close();
});

test('TC03.1 Reject opens the Lite offer and returning preserves pre-consent values', async ({ page }) => {
  const { banner, pageView, hits } = await openPoliticsWithPageView(page);
  expectPreConsentValues(pageView);

  const beforeReject = hits.length;
  await banner.getByRole('button', {
    name: 'Reject and Purchase The i Paper Lite',
    exact: true,
  }).click();

  await expect(page).toHaveURL(/\/subscribe-lite(?:[?#]|$)/);
  const back = page
    .frameLocator('iframe[src*="vx.inews.co.uk/checkout/offer/show"]')
    .getByRole('link', { name: 'Go back to Accept', exact: true });
  await expect(back).toBeVisible();

  const findOfferHit = () => hits.slice(beforeReject).find(
    (hit) => hitPageUrl(hit) === 'https://inews.co.uk/subscribe-lite'
  );
  await expect.poll(() => Boolean(findOfferHit()), {
    message: 'Expected a GA4 hit for the Lite offer',
    timeout: 20_000,
  }).toBe(true);

  const offerHit = findOfferHit();
  expect(offerHit.get('gcs'), 'gcs on the Lite offer').toBe('G101');
  expect(offerHit.get('npa'), 'npa on the Lite offer').toBe('1');

  const beforeReturn = hits.length;
  await back.click();
  await expect(page).toHaveURL((url) => `${url.origin}${url.pathname}` === politicsUrl);
  await expect(banner, 'Consent overlay after returning to Politics').toBeVisible();

  const findReturnedPageView = () => hits.slice(beforeReturn).find(
    (hit) => hit.get('en') === 'page_view' && hitPageUrl(hit) === politicsUrl
  );
  await expect.poll(() => Boolean(findReturnedPageView()), {
    message: 'Expected a GA4 page_view after returning to Politics',
    timeout: 20_000,
  }).toBe(true);

  expectPreConsentValues(findReturnedPageView());
});
