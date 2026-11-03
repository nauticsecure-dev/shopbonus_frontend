const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const moduleFixture = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/lib/integrations.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, { module: moduleFixture, exports: moduleFixture.exports, require: () => ({}) });
const { catalogSyncState, connectionBadge } = moduleFixture.exports;

test('missing capability evidence never advertises readable coupons or an installable banner', () => {
  const summary = moduleFixture.exports.summarizeCapabilities({});
  assert.match(summary, /coupon reading not reported/);
  assert.match(summary, /banner capability not reported/);
  assert.doesNotMatch(summary, /coupons readable/);
});

test('catalog state comes from provider synchronization status, independent of row count and legacy exhausted', () => {
  const result = { imported: 0, exhausted: false, cursor: null, error_code: null, run_id: 'fixture' };
  for (const [status, expected] of [['queued', 'queued'], ['running', 'processing'], ['processing', 'processing'], ['partial', 'partial'], ['completed', 'empty'], ['failed', 'failed'], ['unsupported', 'unsupported']]) {
    assert.equal(catalogSyncState({ ...result, status }), expected);
  }
  assert.equal(catalogSyncState({ ...result, status: 'partial', exhausted: true }), 'partial');
  assert.equal(catalogSyncState({ ...result, status: 'completed', imported: 5 }), 'completed');
  assert.equal(catalogSyncState({ ...result, status: 'failed', error_code: 'capability_unsupported' }), 'unsupported');
  assert.equal(catalogSyncState({ ...result, status: 'failed', error_code: 'provider_auth_failed' }), 'failed');
  assert.equal(catalogSyncState({ ...result, status: undefined }), 'processing');
});

test('paused connections never display a verified or disconnected badge', () => {
  const badge = connectionBadge({ available: true, verification: 'verified' }, { status: 'connected', paused_at: '2026-11-03T00:00:00Z' });
  assert.equal(badge.kind, 'PAUSED');
});

test('App Store NL/EN-owned labels and errors translate without modifying provider text', () => {
  const m = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/i18n/appStoreCopy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: m, exports: m.exports });
  assert.equal(m.exports.appStoreText('nl', 'Pause integration'), 'Integratie pauzeren');
  assert.equal(m.exports.appStoreText('en', 'App Store kon niet worden geladen.'), 'Could not load App Store.');
  assert.equal(m.exports.appStoreText('nl', 'provider_specific_code'), 'provider_specific_code');
});
