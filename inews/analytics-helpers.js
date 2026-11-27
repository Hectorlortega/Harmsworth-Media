const { expect } = require('@playwright/test');

const politicsUrl = 'https://inews.co.uk/category/news/politics';

function readGa4Hits(request) {
  const url = new URL(request.url());
  const analyticsDomains = ['google-analytics.com', 'analytics.google.com'];
  const isAnalyticsHost = analyticsDomains.some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
  );

  if (!isAnalyticsHost || url.pathname !== '/g/collect') {
    return [];
  }

  // GA4 can send parameters in the URL, the POST body, or both.
  const body = request.postData()?.trim();
  const rows = body ? body.split(/\r?\n/) : [''];

  return rows
    .map((row) => {
      const params = new URLSearchParams(url.search);

      for (const [key, value] of new URLSearchParams(row)) {
        params.set(key, value);
      }

      return params;
    })
    .filter((hit) => hit.get('tid')?.startsWith('G-'));
}

function hitPageUrl(hit) {
  return hit.get('dl')?.split(/[?#]/)[0].replace(/\/$/, '');
}

function observeGa4Hits(page) {
  const hits = [];
  page.on('request', (request) => {
    hits.push(...readGa4Hits(request));
  });
  return hits;
}

async function waitForPoliticsPageView(hits) {
  const findPageView = () =>
    hits.find((hit) => hit.get('en') === 'page_view' && hitPageUrl(hit) === politicsUrl);

  await expect.poll(() => Boolean(findPageView()), {
    message: 'Expected a GA4 page_view for the Politics landing page',
    timeout: 20_000,
  }).toBe(true);

  return findPageView();
}

async function openPolitics(page) {
  const banner = page.locator(
    '[data-project="mol-fe-cmp"] > div[class^="overlay_"]'
  );
  await page.goto(politicsUrl, { waitUntil: 'domcontentloaded' });
  await expect(banner, 'Consent overlay before Accept').toBeVisible();
  return banner;
}

async function openPoliticsWithPageView(page) {
  // Start listening before navigation to capture the initial page view.
  const hits = observeGa4Hits(page);
  const banner = await openPolitics(page);
  const pageView = await waitForPoliticsPageView(hits);
  return { banner, pageView, hits };
}

function expectPreConsentValues(pageView) {
  expect(pageView.get('ep.sub_channel_1'), 'Politics sub-channel')
    .toBe('news/politics');
  expect(pageView.get('gcs'), 'gcs before Accept').toBe('G101');
  expect(pageView.get('npa'), 'npa before Accept').toBe('1');
}

function expectAcceptedConsentValues(hit, description) {
  expect(hit.get('gcs'), `gcs ${description}`).toBe('G111');
  expect([null, '0'], `npa ${description}`).toContain(hit.get('npa'));
}

module.exports = {
  politicsUrl,
  readGa4Hits,
  hitPageUrl,
  observeGa4Hits,
  waitForPoliticsPageView,
  openPolitics,
  openPoliticsWithPageView,
  expectPreConsentValues,
  expectAcceptedConsentValues,
};
