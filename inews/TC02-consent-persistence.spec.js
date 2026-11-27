const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  politicsUrl,
  observeGa4Hits,
  waitForPoliticsPageView,
  openPoliticsWithPageView,
  expectPreConsentValues,
  expectAcceptedConsentValues,
} = require('./analytics-helpers');

test('TC02.1 Accepted consent persists after closing and reopening Chrome', async ({
  playwright, channel, headless, locale, timezoneId, viewport, userAgent,
  deviceScaleFactor, isMobile, hasTouch,
}) => {
  test.setTimeout(120_000);
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'inews-playwright-'));
  const options = {
    channel, headless, locale, timezoneId, viewport, userAgent,
    deviceScaleFactor, isMobile, hasTouch,
  };
  let context;

  try {
    context = await playwright.chromium.launchPersistentContext(profile, options);
    const firstPage = context.pages()[0] || await context.newPage();
    const { banner, pageView } = await openPoliticsWithPageView(firstPage);
    expectPreConsentValues(pageView);
    await banner.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(banner, 'Consent overlay removed after Accept').toHaveCount(0);

    await context.close();
    context = undefined;

    context = await playwright.chromium.launchPersistentContext(profile, options);
    const reopenedPage = context.pages()[0] || await context.newPage();
    const hits = observeGa4Hits(reopenedPage);
    await reopenedPage.goto(politicsUrl, { waitUntil: 'domcontentloaded' });
    const reopenedPageView = await waitForPoliticsPageView(hits);

    await expect(
      reopenedPage.locator('[data-project="mol-fe-cmp"] > div[class^="overlay_"]'),
      'Consent overlay after reopening'
    ).toHaveCount(0);
    expect(reopenedPageView.get('ep.sub_channel_1'), 'Politics sub-channel after reopening')
      .toBe('news/politics');
    expectAcceptedConsentValues(reopenedPageView, 'after reopening');
  } finally {
    try {
      if (context) await context.close();
    } finally {
      await fs.rm(profile, { recursive: true, force: true });
    }
  }
});
