const { test, expect } = require('@playwright/test');
const {
  openHome,
  expectDefaultDark,
  consentOverlay,
  acceptConsent,
  selectLight,
} = require('./appearance-helpers');

test('TC01.1 Dark device preference is used before a choice is stored', async ({ page }) => {
  await openHome(page);
  await expectDefaultDark(page);
});

test('TC01.2 Accept removes the consent overlay', async ({ page }) => {
  await openHome(page);
  await acceptConsent(page);
});

test('TC01.3 Light appearance overrides dark device preference after refresh', async ({ page }) => {
  await openHome(page);
  await expectDefaultDark(page);
  await acceptConsent(page);

  await selectLight(page);

  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches),
    'Device colour scheme after refresh').toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('colourSchemeAppearance')),
    'Stored appearance preference after refresh').toBe('light');
  await expect(consentOverlay(page), 'Consent overlay after refresh').toHaveCount(0);
});
