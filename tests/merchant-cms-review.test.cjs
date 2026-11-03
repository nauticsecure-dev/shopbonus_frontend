const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireStub) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, require: requireStub });
  return module.exports;
}
test('revision comparison includes removal, insertion, array order and visibility changes without mutating snapshots', () => {
  const { compareMerchantContent } = load('src/lib/merchantRevisionComparison.ts');
  const current = { hero: { heading: 'Draft', subtitle: 'Remove me' }, order: ['hero', 'faq'], visible: true };
  const selected = { hero: { heading: 'Approved', cta: 'Join' }, order: ['faq', 'hero'], visible: false };
  const before = JSON.stringify([current, selected]);
  const rows = compareMerchantContent(current, selected);
  assert.deepEqual(Array.from(rows, row => row.path), ['hero.heading', 'hero.subtitle', 'hero.cta', 'order.0', 'order.1', 'visible']);
  assert.equal(rows[1].selected, '—');
  assert.equal(rows[2].current, '—');
  assert.equal(rows.at(-1).selected, 'false');
  assert.equal(JSON.stringify([current, selected]), before);
  assert.equal(compareMerchantContent(selected, structuredClone(selected)).length, 0);
  assert.equal(compareMerchantContent({ platforms: { tiles: [{ status: 'AVAILABLE', connectable: true }] } }, { platforms: { tiles: [{ status: 'COMING_SOON' }] } }).length, 0);
});
test('CMS labels and API failures use the selected locale without leaking English server errors', () => {
  class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const { merchantCmsText: text, merchantCmsError: error } = load('src/i18n/merchantCmsCopy.ts', () => ({ ApiError }));
  assert.equal(text('nl', 'Save draft'), 'Concept opslaan');
  assert.equal(text('en', 'Save draft'), 'Save draft');
  assert.equal(text('de', 'Save draft'), 'Entwurf speichern');
  assert.match(error('nl', new ApiError('Untranslated conflict', 409), 'Save failed'), /Versieconflict/);
  assert.match(error('nl', new ApiError('Untranslated validation', 422), 'Save failed'), /Validatie mislukt/);
  assert.match(error('en', new ApiError('Dutch API message', 419), 'Save failed'), /session expired/);
  assert.equal(error('nl', new Error('Internal server detail'), 'Upload failed'), 'Uploaden mislukt. Probeer opnieuw.');
});
