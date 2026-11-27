const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  homeUrl,
  openHome,
  expectDefaultDark,
  consentOverlay,
  acceptConsent,
  expectLight,
  selectLight,
} = require('./appearance-helpers');

test('TC02.1 Light appearance persists through menu, back and footer navigation', async ({ page }) => {
  test.setTimeout(120_000);
  await openHome(page);
  await expectDefaultDark(page);
  await acceptConsent(page);
  await selectLight(page);

  // The hamburger is visible in the site's narrower desktop layout.
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.locator('#hamburger-menu-button').click();
  const news = page.locator('header').getByRole('link', { name: 'News', exact: true });
  await expect(news).toHaveAttribute('href', 'https://www.newscientist.com/section/news/');
  await news.click();
  await expect(page).toHaveURL('https://www.newscientist.com/section/news/');
  await expectLight(page);

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(homeUrl);
  await expectLight(page);

  const about = page.locator('footer').getByRole('link', { name: 'About us', exact: true });
  await expect(about).toHaveAttribute('href', 'https://www.newscientist.com/about/');
  await about.click();
  await expect(page).toHaveURL('https://www.newscientist.com/about/');
  await expectLight(page);

  const contact = page.locator('footer').getByRole('link', { name: 'Contact Us', exact: true });
  await expect(contact).toHaveAttribute('href', 'https://www.newscientist.com/contact-us/');
  await contact.click();
  await expect(page).toHaveURL('https://www.newscientist.com/contact-us/');
  await expectLight(page);

  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL('https://www.newscientist.com/about/');
  await expectLight(page);
});

test('TC02.2 Light appearance persists after closing and reopening Chrome', async ({
  playwright, channel, headless, locale, colorScheme, viewport, userAgent,
  deviceScaleFactor, isMobile, hasTouch,
}) => {
  test.setTimeout(120_000);
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'newscientist-playwright-'));
  const options = {
    channel, headless, locale, colorScheme, viewport, userAgent,
    deviceScaleFactor, isMobile, hasTouch,
  };
  let context;

  try {
    context = await playwright.chromium.launchPersistentContext(profile, options);
    const firstPage = context.pages()[0] || await context.newPage();
    await openHome(firstPage);
    await expectDefaultDark(firstPage);
    await acceptConsent(firstPage);
    await selectLight(firstPage);

    await context.close();
    context = undefined;

    context = await playwright.chromium.launchPersistentContext(profile, options);
    const reopenedPage = context.pages()[0] || await context.newPage();
    await openHome(reopenedPage);
    expect(await reopenedPage.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches),
      'Device colour scheme after reopening').toBe(true);
    await expectLight(reopenedPage);
    await expect(consentOverlay(reopenedPage), 'Consent overlay after reopening').toHaveCount(0);
  } finally {
    try {
      if (context) await context.close();
    } finally {
      await fs.rm(profile, { recursive: true, force: true });
    }
  }
});
