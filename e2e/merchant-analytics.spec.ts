import {expect,test,type Page} from '@playwright/test';
async function setup(page: Page, locale: "nl" | "en" = "nl") {
  const state = { shop: "woon", fail: false, failChart: false, failDrill: false, empty: false, count: 8, requests: [] as string[] };
  await page.addInitScript((locale) => {
    document.cookie = 'XSRF-TOKEN=analytics-fixture; path=/';
    localStorage.setItem("shopbonus-locale", locale);
    localStorage.setItem("shopbonus-locale-explicit", "1");
  }, locale);
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204 });
    if (path === "/api/v1/me") return route.fulfill({ json: { data: {
      id: "owner", first_name: "Sanne", email: "merchant@example.test", email_verified: true, status: "active", role: "merchant",
      onboarding_intent: "merchant", roles: [], destination: "workspace", locale: "nl", two_factor_enabled: true, support_session: null,
      workspaces: ["woon", "fiets"].map((id) => ({ id, name: id === "woon" ? "Woon & Co" : "Fietsen Utrecht", status: "approved", role: "owner", is_current: id === state.shop })),
    } } });
    if (path.endsWith("/select")) { state.shop = path.split("/")[4]; return route.fulfill({ json: { data: {} } }); }
    if (path.endsWith("/onboarding")) return route.fulfill({ json: { data: { webshop_status: "approved", next_step: null } } });
    if (path.endsWith('/analytics/overview')) {
 state.requests.push(url.pathname + url.search);
 if (state.fail) return route.fulfill({status:503,json:{error:{message:'Unavailable'}}});
 if (state.empty) return route.fulfill({json:{data:{from:'2026-10-01',to:'2026-10-31',timezone:'Europe/Amsterdam',generated_at:'2026-10-31T10:00:00Z',orders:{},sales_series:[{date:'2026-10-01',paid_orders:0,orders:{}}],vouchers:{issued:0,redeemed:0},answer24:{claims:0},banner_metrics:{ctr:null},attribution:{},network:{as_referrer:{journeys:0},as_receiver:{journeys:0}}}}});
 const n=Number(url.searchParams.get('days')??30);const id=path.split('/')[4];
 return route.fulfill({json:{data:{from:'2026-10-01T00:00:00Z',to:'2026-10-31T23:59:59Z',timezone:'Europe/Amsterdam',generated_at:'2026-10-31T10:00:00Z',orders:{EUR:{paid_orders:id==='woon'?17:3,net_minor:12345},USD:{paid_orders:2,net_minor:9900}},sales_series:Array.from({length:n},(_,i)=>({date:'2026-10-'+String(i%30+1).padStart(2,'0'),paid_orders:1,orders:{EUR:{paid_orders:1,net_minor:700}}})),vouchers:{issued:9,redeemed:4,reserved:1},answer24:{claims:6},banner_metrics:{status:'available',viewable_impressions:123,cta_clicks:11,ctr:0.0894},attribution:{click:{orders:7,by_currency:{EUR:{net_revenue_minor:5000}}},voucher:{orders:3,by_currency:{}},view:{orders:1,by_currency:{}},unattributed:{orders:8,by_currency:{}}},network:{as_referrer:{journeys:2},as_receiver:{journeys:1}}}}});
 }
 if (path.endsWith('/analytics/attribution/orders')) {
   if (state.failDrill) return route.fulfill({status:503,json:{error:{message:'Unavailable'}}});
   return route.fulfill({json:{data:state.empty ? [] : [{id:'order-1',reference:'REAL-001',paid_at:'2026-10-31T10:00:00Z',currency:'EUR',net_minor:5000,attribution_type:'click'}],meta:{current_page:1,last_page:1,total:1}}});
 }
 if (path.endsWith("/dashboard")) {
      state.requests.push(url.pathname + url.search);
      if (state.fail) return route.fulfill({ status: 503, json: { message: "Dashboard tijdelijk niet beschikbaar" } });
      const id = path.split("/")[4];
      const p = Number(url.searchParams.get("page") ?? 1);
      return route.fulfill({ json: { data: {
        webshop: { id, name: id === "woon" ? "Woon & Co" : "Fietsen Utrecht", status: "approved" }, greeting: "good_morning",
        kpis: { active_offers: id === "woon" ? state.count : 3, available_codes: 24, issued_vouchers: 12, claimed_vouchers: 5, redeemed_vouchers: 2, scheduled_offers: 1, paused_offers: 1, open_disputes: 0 },
        connection_health: { status: "healthy", total: 1, connected: 1, attention: 0, last_error_at: null }, recent_activity: [], quick_actions: [], empty: false, definitions: {},
        offers: [{ id: `offer-${p}`, name: `${id} actie ${p}`, summary: "10% korting", type: "percentage", acquisition: "merchant_reward", min_order_minor: 10000, available_codes: 24, issued: 12, status: "active", lifecycle_status: url.searchParams.get("status") ?? "active", attention: [] }],
        offers_meta: { current_page: p, last_page: 2, per_page: 10, total: 11 }, notifications: { unread: 0, latest: [] }, funding: { available_minor: 10000, reserved_minor: 0 }, generated_at: new Date().toISOString(),
      } } });
    }
    if (path.endsWith("/analytics/claims")) {
      if (state.failChart) return route.fulfill({ status: 503, json: { message: "Grafiek tijdelijk niet beschikbaar" } });
      const n = Number(url.searchParams.get("days") ?? 30);
      return route.fulfill({ json: { data: { timezone: "Europe/Amsterdam", from: "2026-10-01", to: "2026-10-30", days: Array.from({ length: n }, (_, i) => ({ date: `2026-10-${String(i % 30 + 1).padStart(2, "0")}`, claims: 1, issued: 2, redeemed: 0 })), totals: { claims: n, issued: n * 2, redeemed: 0 } } } });
    }
    if (path.endsWith("/vouchers")) {
      state.requests.push(url.pathname + url.search);
      return route.fulfill({ json: { data: [{ id: "voucher-1", status: "redeemed", origin: "answer24_claim", code: "****1234", offer_id: "offer-1", offer_name: "Geclaimde actie", issued_at: "2026-09-20T10:00:00Z", claimed_at: "2026-10-01T10:00:00Z", redeemed_at: "2026-10-02T10:00:00Z", expires_at: "2026-12-01T10:00:00Z", reserved_at: null }], meta: { current_page: 1, last_page: 1, total: 1, per_page: 25 } } });
    }
    return route.fulfill({ json: { data: [], meta: { unread_count: 0, total: 0, current_page: 1, per_page: 20 } } });
  });
  await page.route("**/sanctum/csrf-cookie", (route) => route.fulfill({ status: 204, headers: { 'set-cookie': 'XSRF-TOKEN=analytics-fixture; Path=/' } }));
  return state;
}


test('analytics uses scoped totals, date requests, currencies and order drill-down',async({page})=>{
 const state=await setup(page);await page.goto('/dashboard/analytics');
 await expect(page.getByText('19 bestellingen',{exact:true})).toHaveCount(0);
 await expect(page.getByText('€123,45',{exact:true})).toBeVisible();
 await expect(page.getByText('123',{exact:true})).toBeVisible();
 await page.getByLabel('Periode',{exact:true}).selectOption('7');
 await expect.poll(()=>state.requests.some(r=>r.includes('days=7'))).toBe(true);
 await expect(page.getByRole('button',{name:'Klik',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Klik',exact:true}).click();
 await expect(page.getByText('REAL-001')).toBeVisible();
 await expect(page.getByRole('link',{name:'Bekijk details'})).toHaveAttribute('href','/dashboard/vouchers');
 await expect(page.getByRole('link',{name:'Bekijk banners en experimenten'})).toHaveAttribute('href','/dashboard/banners');
 await page.getByLabel('Valuta',{exact:true}).selectOption('USD');
 await expect(page.getByText(/Netto-omzet \(USD\)/)).toBeVisible();
});
test('report failure has retry and never shows sample totals',async({page})=>{
 const state=await setup(page);state.fail=true;await page.goto('/dashboard/analytics');
 await expect(page.getByRole('alert').filter({hasText:'kon niet worden geladen'})).toBeVisible();
 await expect(page.getByText('12.500',{exact:true})).toHaveCount(0);
 state.fail=false;await page.getByRole('button',{name:'Opnieuw proberen'}).click();
 await expect(page.getByText('€123,45',{exact:true})).toBeVisible();
});

test('English analytics translates controls, chart, details and locale formatting', async ({ page }) => {
  await setup(page, 'en');
  await page.goto('/dashboard/analytics');
  await expect(page.getByRole('heading', { name: 'How your offers are performing.' })).toBeVisible();
  await expect(page.getByLabel('Period', { exact: true })).toContainText('30 days');
  await expect(page.getByText('Net revenue (EUR)', { exact: true })).toBeVisible();
  await expect(page.getByText('€123.45', { exact: true })).toBeVisible();
  await expect(page.getByText('Viewable banner impressions', { exact: true })).toBeVisible();
  await expect(page.getByText('CTR: 8.9%. A click or impression is not a paid order.', { exact: true })).toBeVisible();
  const chart = page.getByRole('img', { name: 'Trend chart', exact: true });
  await expect(chart).toBeVisible();
  await expect(chart.locator('circle title').first()).toHaveText('2026-10-01: 7');
  await page.getByLabel('Metric', { exact: true }).selectOption('orders');
  await expect(chart.locator('circle title').first()).toHaveText('2026-10-01: 1');
  await page.getByLabel('Currency', { exact: true }).selectOption('USD');
  await expect(page.getByText('US$99.00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Click', exact: true }).click();
  await expect(page.getByRole('columnheader', { name: 'Reference', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '31/10/2026', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'View details' })).toHaveAttribute('href', '/dashboard/vouchers');
  await expect(page.getByRole('link', { name: 'View banners and experiments' })).toHaveAttribute('href', '/dashboard/banners');
  await expect(page.getByText('Cross-shop: 2 referred · 1 received orders.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Zo presteren jouw|Verkoopontwikkeling|Voucherprestaties|Attributiedetails/)).toHaveCount(0);
});

test('English report retry, drill-down failure and empty states are translated', async ({ page }) => {
  const state = await setup(page, 'en');
  state.fail = true;
  await page.goto('/dashboard/analytics');
  await expect(page.getByRole('alert').filter({ hasText: 'The report could not be loaded. Please try again.' })).toBeVisible();
  state.fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('€123.45', { exact: true })).toBeVisible();
  state.failDrill = true;
  await page.getByRole('button', { name: 'Click', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Orders could not be loaded.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  state.failDrill = false;
  state.empty = true;
  await page.getByLabel('Period', { exact: true }).selectOption('7');
  await expect(page.getByText('No paid orders in this period.', { exact: true })).toBeVisible();
  await expect(page.getByText('CTR: Not yet available. A click or impression is not a paid order.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Click', exact: true }).click();
  await expect(page.getByText('No orders found.', { exact: true })).toBeVisible();
});
