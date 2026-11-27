# Playwright exercise

## Setup and execution

- Install Node.js 20 or later, npm, and Google Chrome.
- Run `npm ci` in the project directory.
- Run both projects with `npm test`, or run one project with
  `npm test -- --project=inews-mobile-chrome` or
  `npm test -- --project=newscientist-desktop-chrome`.
- To run or debug individual tests in VS Code, install the Microsoft
  **Playwright Test for VS Code** extension and use the Testing panel.
- After a terminal run, open the HTML report with `npx playwright show-report`.

The iNews project uses Chrome with Playwright's Pixel 7 mobile emulation,
`en-GB` locale and `Europe/London` timezone. These settings do not change the
network IP address: use a UK network when checking the UK visitor journey.
Emulation is not a substitute for testing on a physical mobile device.

The New Scientist project uses desktop Chrome, `en-GB` and an emulated dark
device colour scheme. Each test starts in a fresh browser context with no
pre-existing site storage.

## iNews consent checks

Each test starts with fresh browser storage. The tests check the initial Politics
page view, removal of the consent overlay, and the next captured GA4 hit after
Accept. The post-Accept test also checks the initial page view in the same
session, so it verifies the consent transition without depending on another test.
The standard iNews tests explicitly close their contexts afterwards: this avoids
a reset timeout observed when VS Code's **Show browser** mode reuses a context
after the site registers a service worker. Service workers remain enabled
during the tests.

Another test accepts consent, closes Chrome and reopens it with the same
temporary profile. It checks that the banner is absent and a new Politics page
view carries the accepted consent values. The profile is removed afterwards.
This tests an immediate restart, not the full 13-month period stated by the
site's consent banner.

The separate Reject/Lite journey checks the first captured GA4 hit associated
with the Lite offer for `gcs=G101` and `npa=1`, then checks that the consent
banner and original Politics page-view values return. These Lite journey values
are based on observed behavior, not requirements in the original brief. The
test does not purchase a subscription or assert that every Lite event has these
values.

GA4 requests can use subdomains of both `google-analytics.com` and
`analytics.google.com`. The test checks the first matching request rather than
waiting for a request with the expected consent values. The request listener is
armed immediately before the click to avoid missing an immediate hit. A request
in the small interval between arming it and the click could be counted, so this
is not an exact browser-side click boundary.

These are live-site tests: network conditions, location, consent configuration
and third-party analytics can affect results. A captured browser request does
not prove that GA4 received or processed the event. Screenshots and traces are
configured for failures; inspect those and the network details when debugging.

## New Scientist appearance checks

The tests check the device's dark preference is used with no stored appearance
choice, that Accept removes the consent overlay, and that choosing light persists
after a refresh despite the device still preferring dark. The persistence test
repeats the initial checks and consent action in its own fresh context.

Additional tests check the choice across internal menu and footer navigation
and browser Back. To exercise a real browser restart, a separate test closes
Chrome and reopens it using the same temporary profile, without clearing its
storage between launches; the profile is deleted after the test. The menu test
uses a narrower desktop viewport to expose the responsive hamburger menu.

## CI and diagnosing failures

The GitHub Actions workflow runs both projects on pushes and pull requests,
installs Chrome, and retains the HTML report and failure screenshots and traces
for seven days. The configuration uses a 60-second default test timeout,
10-second assertion timeout, 25-second navigation timeout and one CI retry.
Some longer persistence tests override the test timeout to 120 seconds. GitHub-hosted
runner IPs are not guaranteed to be in the UK; locale and timezone settings do
not change the IP.

In an investigated GitHub Actions run, nine tests failed because their expected
consent overlay did not appear. The iNews consent provider identified that
runner as being in the US, and New Scientist loaded US CCPA consent resources.
This is strong evidence that the runner's location affected the consent journey,
but the New Scientist cause has not been confirmed independently. The same
suite passed locally; the CI failures should not be treated as passing tests.

To run the intended UK journey in CI, a possible solution is an isolated runner
with UK network egress. Its IP location must be verified with the sites, and the
full suite rerun to confirm the result. Such infrastructure may have a cost and
requires security safeguards, especially for public pull requests; GitHub
[recommends self-hosted runners only for private repositories](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners).
Until a suitable runner is available, run the tests locally from a UK network and
use the CI report to investigate failures.

For a failure, inspect the report, trace, screenshot and DOM snapshot, and
compare them with a fresh manual visit in the same environment. A missing or
changed control suggests selector or site markup changes; a control that works
but produces the wrong theme, storage or analytics values suggests a product
regression. Repeat the test and check network responses, timing and retry
results: an intermittent failure may be flakiness or an intermittent product
bug, so don't assume a retry pass proves the site is healthy. Failure artifacts
may include site data and should be handled accordingly.

For longer-term stability, use controlled test environments and deterministic
fixtures or mock third-party analytics and consent services for most checks;
retain a smaller scheduled live-site smoke suite to detect integration changes.
Mocks do not prove the real integrations work.

To broaden coverage, add Playwright projects for Firefox and WebKit and test
appropriate viewport and colour-scheme combinations. Browser engines and UI
behaviour differ, and more projects increase execution time and maintenance.
Mobile emulation does not cover physical-device browsers, hardware or OS
behaviour; real devices or a device cloud provide that coverage at extra cost,
setup and potential flakiness.

### Adding browser projects

The current configuration has two Chrome projects. For example, to run the
iNews tests with desktop Chrome as well, add this entry to the `projects` array
in `playwright.config.js`:

```js
{
  name: 'inews-desktop-chrome',
  testMatch: '**/inews/**/*.spec.js',
  use: {
    ...devices['Desktop Chrome'],
    timezoneId: 'Europe/London',
  },
},
```

The existing Chrome installation works for both desktop and mobile emulation.
Adding a project makes `npm test` and CI run its matching tests too. Those tests
may need adjustments if the site behaves differently on desktop.

For WebKit, first remove `channel: 'chrome'` from the shared `use` block and add
it to each existing Chrome project's `use` block. Otherwise the WebKit project
would inherit the Chrome channel. 

```js
{
  name: 'inews-desktop-chrome',
  testMatch: '**/inews/**/*.spec.js',
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    timezoneId: 'Europe/London',
  },
},
```

Then add, for example:

```js
{
  name: 'inews-desktop-webkit',
  testMatch: '**/inews/TC01-analytics-consent.spec.js',
  use: {
    ...devices['Desktop Safari'],
    timezoneId: 'Europe/London',
  },
},
```

Install WebKit locally with `npx playwright install webkit`. In
`.github/workflows/playwright.yml`, change the browser installation step to:

```yaml
- run: npx playwright install --with-deps chrome webkit
```

The example limits WebKit to TC01. The browser-reopen tests currently launch
Chromium explicitly and need adapting before including them in a WebKit project.
Playwright WebKit tests the WebKit engine, not the installed Safari application.

## AI use

GitHub Copilot was used to investigate the live sites, propose and write tests,
debug failures, and help prepare the configuration and documentation.
