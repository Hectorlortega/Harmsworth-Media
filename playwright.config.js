const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    channel: 'chrome',
    locale: 'en-GB',
    actionTimeout: 10_000,
    navigationTimeout: 25_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'inews-mobile-chrome',
      testMatch: '**/inews/**/*.spec.js',
      use: {
        ...devices['Pixel 7'],
        timezoneId: 'Europe/London',
      },
    },
    {
      name: 'newscientist-desktop-chrome',
      testMatch: '**/newscientist/**/*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
      },
    },
  ],
});