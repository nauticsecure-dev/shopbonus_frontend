// Read-only browser audit against a running local frontend/API.
// BASE_URL=http://localhost:3038 node scripts/frontend-design-audit.cjs
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://localhost:3038';
const out = path.resolve(process.env.DESIGN_AUDIT_OUTPUT || 'test-results/design-review');
const publicRoutes = ['/', '/webshops', '/kortingscodes', '/hoe-werkt-het', '/over-ons', '/faq', '/voor-webshops', '/voor-webshops/aanmelden', '/account?mode=login', '/account', '/forgot-password', '/reset-password', '/verify-email', '/invitations/accept', '/pagina/privacy', '/pagina/algemene-voorwaarden', '/support'];

function inspect() {
  const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const label = e => e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent).join(' ') || e.labels?.[0]?.textContent || e.getAttribute('title') || e.textContent?.trim();
  return {
    heading: [...document.querySelectorAll('h1')].map(e => e.textContent),
    scrollWidth: document.documentElement.scrollWidth,
    viewport: innerWidth,
    brokenImages: [...document.images].filter(e => visible(e) && e.complete && e.naturalWidth === 0).map(e => e.src),
    unlabelled: [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]),select,textarea,button')].filter(visible).filter(e => !label(e)).map(e => e.outerHTML.slice(0,300)),
    emptyLinks: [...document.querySelectorAll('a')].filter(visible).filter(e => !label(e) && !e.querySelector('img[alt]')).map(e => e.outerHTML.slice(0,250)),
  };
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: 'chrome' }) });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'nl-NL' });
  await context.addCookies([{ name: 'shopbonus-locale', value: 'nl', url: base }]);
  const results = [];
  try {
    for (const route of process.argv.length > 2 ? process.argv.slice(2) : publicRoutes) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.evaluate(() => window.scrollTo(0, 0));
          const screenshot = `${width}-${route.replace(/[^a-z0-9]/gi, '_') || 'home'}.png`;
          await page.screenshot({ path: path.join(out, screenshot), fullPage: true, caret: 'initial' });
          const dom = await page.evaluate(inspect);
          results.push({ route, width, status: response.status(), finalURL: page.url(), dom, errors: [...errors], screenshot });
          fs.writeFileSync(path.join(out, 'responsive.json'), JSON.stringify(results, null, 2));
          console.log(width, route, response.status(), dom.scrollWidth > width ? 'OVERFLOW' : '', dom.brokenImages.length ? 'BROKEN IMAGE' : '');
        }
      } catch (error) {
        results.push({ route, errors, failure: error.message });
        fs.writeFileSync(path.join(out, 'responsive.json'), JSON.stringify(results, null, 2));
        console.log(route, error.message);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
