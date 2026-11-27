const { expect } = require('@playwright/test');

const homeUrl = 'https://www.newscientist.com/';

async function openHome(page) {
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
}

async function expectDefaultDark(page) {
  expect(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches),
    'Device colour scheme').toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('colourSchemeAppearance')),
    'No stored appearance preference').toBeNull();
}

function consentOverlay(page) {
  return page.locator('[data-project="mol-fe-cmp"] > div[class^="overlay_"]');
}

async function acceptConsent(page) {
  const overlay = consentOverlay(page);
  await expect(overlay, 'Consent overlay before Accept').toBeVisible();
  await overlay.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(overlay, 'Consent overlay removed after Accept').toHaveCount(0);
}

async function expectLight(page) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(
    () => page.evaluate(() => localStorage.getItem('colourSchemeAppearance')),
    { message: 'Light appearance preference is stored' }
  ).toBe('light');
}

async function selectLight(page) {
  await page.locator('header').getByRole('switch').click();
  await expectLight(page);
}

module.exports = {
  homeUrl,
  openHome,
  expectDefaultDark,
  consentOverlay,
  acceptConsent,
  expectLight,
  selectLight,
};
