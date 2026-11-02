import { test, expect } from "@playwright/test";
import fs from "node:fs";
import ts from "typescript";

const source = ts.transpileModule(fs.readFileSync("src/lib/cookies.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const bundle = `(() => { const exports = {}; const require = () => ({}); ${source}; window.consentFixture = exports; })();`;

test("withdrawal stops a loaded tracker, clears optional cookies, and supports opt-in again", async ({ page }) => {
  await page.route("http://consent.example.test/**", async (route) => {
    if (route.request().url().endsWith("tracker.js")) {
      await route.fulfill({ contentType: "application/javascript", body: `
        window.fixtureTicks = 0; window.fixtureEvents = 0;
        let timer;
        const listener = () => window.fixtureEvents++;
        window.consentFixture.registerConsentTracker('analytics', {
          enable() { timer = setInterval(() => window.fixtureTicks++, 10); window.addEventListener('fixture-event', listener); },
          disable() { clearInterval(timer); window.removeEventListener('fixture-event', listener); }
        });
        timer = setInterval(() => window.fixtureTicks++, 10);
        window.addEventListener('fixture-event', listener);
        document.cookie = '_ga_fixture=optional; Path=/';
        document.cookie = 'sb_mkt_fixture=optional; Path=/';
        localStorage.setItem('_ga_fixture', 'optional');
      ` });
    } else await route.fulfill({ contentType: "text/html", body: '<!doctype html><script data-consent-tracker="analytics" data-src="/tracker.js"></script>' });
  });
  await page.goto("http://consent.example.test/");
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    document.cookie = "essential_fixture=keep; Path=/";
    (window as any).consentFixture.applyAllowedTrackers(["session", "analytics"]);
  });
  await expect.poll(() => page.evaluate(() => (window as any).fixtureTicks)).toBeGreaterThan(2);
  await page.evaluate(() => (window as any).consentFixture.applyAllowedTrackers(["session"]));
  const stopped = await page.evaluate(() => ({ ticks: (window as any).fixtureTicks, events: (window as any).fixtureEvents }));
  await page.evaluate(() => window.dispatchEvent(new Event("fixture-event")));
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => (window as any).fixtureTicks)).toBe(stopped.ticks);
  expect(await page.evaluate(() => (window as any).fixtureEvents)).toBe(stopped.events);
  expect(await page.evaluate(() => document.cookie)).toContain("essential_fixture=keep");
  expect(await page.evaluate(() => document.cookie)).not.toMatch(/_ga_fixture|sb_mkt_fixture/);
  expect(await page.evaluate(() => localStorage.getItem("_ga_fixture"))).toBeNull();
  await page.evaluate(() => (window as any).consentFixture.applyAllowedTrackers(["session", "analytics"]));
  await expect.poll(() => page.evaluate(() => (window as any).fixtureTicks)).toBeGreaterThan(stopped.ticks);
  await page.evaluate(() => (window as any).consentFixture.applyAllowedTrackers(["session"]));
  const stoppedAgain = await page.evaluate(() => (window as any).fixtureTicks);
  await page.waitForTimeout(80);
  expect(await page.evaluate(() => (window as any).fixtureTicks)).toBe(stoppedAgain);
});

test("withdrawing an SDK without shutdown support replaces the running document", async ({ page }) => {
  await page.route("http://unknown.example.test/**", route => route.fulfill({ contentType: "text/html", body: '<!doctype html><p>Consent fixture</p>' }));
  await page.goto("http://unknown.example.test/");
  await page.addScriptTag({ content: bundle });
  await page.evaluate(() => {
    const tracker = document.createElement("script");
    tracker.dataset.consentTracker = "unmanaged";
    tracker.dataset.consentLoaded = "1";
    tracker.textContent = "window.unmanagedTicks = 0; setInterval(() => window.unmanagedTicks++, 10);";
    document.body.append(tracker);
    document.cookie = "_ga_fixture=optional; Path=/";
  });
  await expect.poll(() => page.evaluate(() => (window as any).unmanagedTicks)).toBeGreaterThan(1);
  await Promise.all([
    page.waitForEvent("load"),
    page.evaluate(() => (window as any).consentFixture.applyAllowedTrackers([])),
  ]);
  expect(await page.evaluate(() => (window as any).unmanagedTicks)).toBeUndefined();
  expect(await page.evaluate(() => document.cookie)).not.toContain("_ga_fixture");
});
