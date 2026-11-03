const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports,
    require: name => name.startsWith('.') ? load(path.resolve(path.dirname(file), name + '.ts')) : require(name),
  }, { filename: file });
  return module.exports;
}

test('German chrome has every NL/EN key and preserves substitution tokens', () => {
  const { dictionaries } = load('src/i18n/dictionaries.ts');
  const tokens = value => [...value.matchAll(/\{[\w.]+\}/g)].map(m => m[0]).sort();
  assert.deepEqual(Object.keys(dictionaries.de).sort(), Object.keys(dictionaries.nl).sort());
  assert.deepEqual(Object.keys(dictionaries.de).sort(), Object.keys(dictionaries.en).sort());
  for (const key of Object.keys(dictionaries.en)) {
    assert.ok(dictionaries.de[key].trim(), key);
    assert.deepEqual(tokens(dictionaries.de[key]), tokens(dictionaries.en[key]), key);
  }
});

test('German regional locales are accepted; unsupported languages stay excluded', () => {
  const locale = load('src/types/locale.ts');
  assert.equal(locale.normalizeLocale('de-DE'), 'de');
  assert.equal(locale.normalizeLocale('de_AT'), 'de');
  assert.equal(locale.normalizeLocale('fr'), 'nl');
  assert.equal(locale.LOCALE_LABELS.de, 'Deutsch');
});

test('German landing content never merges Dutch marketing defaults into omitted fields', () => {
  const { mergeHomepageContent } = load('src/lib/homepageDefaults.ts');
  const { mergeAboutUsContent } = load('src/lib/aboutUsDefaults.ts');
  const { mergeMerchantLandingContent } = load('src/lib/merchantLandingDefaults.ts');
  const missing = mergeHomepageContent(null, 'de');
  assert.equal(missing.translation_unavailable, true);
  assert.equal(missing.hero.heading, '');
  for (const merge of [mergeHomepageContent, mergeAboutUsContent, mergeMerchantLandingContent]) {
    const merged = merge({ title: 'ShopBonus', hero: { heading: 'Willkommen' } }, 'de');
    assert.equal(merged.hero.heading, 'Willkommen');
    assert.equal(merged.hero.subtitle, '');
    assert.equal(merged.nav.links.length, 0);
  }
});

test('German account copy covers the authentication contract including recovery and second factor', () => {
  const { authCopy } = load('src/i18n/authCopy.ts');
  assert.deepEqual(Object.keys(authCopy('de')).sort(), Object.keys(authCopy('en')).sort());
  assert.equal(authCopy('de').titleLogin, 'Willkommen zurück bei ShopBonus.');
  assert.equal(authCopy('de').twoFactorSubmit, 'Bestätigen');
});
