/* Rendered form regression harness. API calls are controlled; no provider-quality claim. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'src/app/app/platform/ai-support/settings/page.tsx');
let locale = 'en', state = [], cursor = 0, effects = [], mounting = true, saved, failSave;
const original = {
  enabled: false, model: 'synthetic-primary', languages: ['en', 'nl'], daily_request_limit: 73,
  timeout_seconds: 17, max_retry: 1, restrictions: [], tone: 'warm', empathy: 'high', answer_detail: 'detailed',
  target_answer_words: 81, max_answer_words: 171, response_deadline_ms: 16000,
  daily_cost_limit_eur: 12.25, fallback_model: 'synthetic-fallback',
};
class ApiError extends Error { constructor(status, code) { super('Untranslated server message'); this.status = status; this.code = code; } }
const hooks = { ...React,
  useState(initial) { const index = cursor++; if (mounting) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; },
  useMemo: fn => fn(), useCallback: fn => fn, useEffect(fn) { if (mounting) effects.push(fn); },
};
let policyApi;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const req = name => {
    if (name === 'react') return hooks;
    if (name === '@/i18n/LocaleContext') return { useLocale: () => ({ locale }) };
    if (name === '@/components/DashboardShell') return { __esModule: true, default: ({ children }) => children };
    if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name === '@/lib/api') return { ApiError, apiRequest: () => { throw Error('Unexpected API request'); } };
    if (name === '@/lib/aiSupportAdmin') return policyApi;
    if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2) + '.ts'));
    return require(name);
  };
  new Function('require', 'module', 'exports', compiled)(req, module, module.exports);
  cache.set(file, module.exports);
  return module.exports;
}
// Reuse actual defaults; tests override only the API transport exports.
policyApi = load(path.join(root, 'src/lib/aiSupportAdmin.ts'));
policyApi = { ...policyApi,
  fetchPlatformSettings: async () => ({ data: [{ id: 'synthetic-draft', status: 'draft', value: original }], published: { values: {}, versions: {} } }),
  fetchAiOperations: async () => null, fetchAiReviews: async () => [],
  createSupportPolicyDraft: async (value) => { if (failSave) throw failSave; saved = value; return { id: 'saved-draft' }; },
};
const Page = load(pagePath).default;
function expand(node) {
  if (Array.isArray(node)) return node.flatMap(expand);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.type === 'function') return expand(node.type(node.props));
  return { type: node.type, props: node.props, children: expand(React.Children.toArray(node.props.children)) };
}
function render() { cursor = 0; return expand(Page()); }
function nodes(tree, predicate) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(n => nodes(n, predicate)); return [...(predicate(tree) ? [tree] : []), ...nodes(tree.children, predicate)]; }
function text(node) { if (Array.isArray(node)) return node.map(text).join(''); if (!node || typeof node !== 'object') return String(node ?? ''); return text(node.children); }
function button(tree, name) { return nodes(tree, n => n.type === 'button' && text(n) === name)[0]; }
function field(tree, name) { const label = nodes(tree, n => n.type === 'label' && text(n).startsWith(name))[0]; assert.ok(label, name); return nodes(label, n => ['input', 'select'].includes(n.type))[0]; }
async function mount(language) {
  locale = language; state = []; effects = []; mounting = true; render(); mounting = false;
  global.window = { setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {} };
  effects.forEach(fn => fn()); await new Promise(resolve => setTimeout(resolve, 10));
  return render();
}
(async () => {
  let tree = await mount('en');
  for (const name of ['Tone', 'Empathy', 'Answer detail', 'Target answer words', 'Maximum answer words']) assert.equal(field(tree, name).props.disabled, false);
  field(tree, 'Tone').props.onChange({ target: { value: 'direct' } });
  field(tree, 'Empathy').props.onChange({ target: { value: 'minimal' } });
  field(tree, 'Target answer words').props.onChange({ target: { value: '93' } });
  button(tree, 'OpenAI').props.onClick(); tree = render();
  for (const name of ['Response deadline (ms)', 'Daily cost limit (EUR)', 'Fallback model']) assert.equal(field(tree, name).props.disabled, false);
  assert.equal(field(tree, 'Reasoning effort').props.disabled, true);
  field(tree, 'Daily cost limit (EUR)').props.onChange({ target: { value: '7.125' } });
  field(tree, 'Response deadline (ms)').props.onChange({ target: { value: '18000' } });
  field(tree, 'Fallback model').props.onChange({ target: { value: 'edited-fallback' } });
  tree = render(); await button(tree, 'Save draft').props.onClick();
  // onClick intentionally returns void; wait for the async save and reload.
  await new Promise(resolve => setTimeout(resolve, 10));
  for (const [key, value] of Object.entries({ ...original, tone: 'direct', empathy: 'minimal', target_answer_words: 93, daily_cost_limit_eur: 7.125, response_deadline_ms: 18000, fallback_model: 'edited-fallback' })) assert.deepEqual(saved[key], value, key);
  for (const [lang, title, save, tone, fixed] of [
    ['nl', 'AI Support-instellingen', 'Concept opslaan', 'Toon', 'Vastgelegd door serverbeleid'],
    ['en', 'AI Support settings', 'Save draft', 'Tone', 'Fixed by server policy'],
    ['de', 'KI-Support-Einstellungen', 'Entwurf speichern', 'Ton', 'Durch Serverrichtlinie festgelegt'],
  ]) {
    tree = await mount(lang);
    assert.ok(text(tree).includes(title)); assert.ok(button(tree, save)); assert.ok(field(tree, tone));
    assert.ok(text(tree).includes(fixed));
  }
  failSave = new ApiError(422, 'validation_failed');
  tree = await mount('de'); button(tree, 'Entwurf speichern').props.onClick(); await new Promise(resolve => setTimeout(resolve, 10));
  assert.ok(text(render()).includes('Einstellungen auf zulässige Werte und Grenzen prüfen.'));
  assert.ok(!text(render()).includes('Untranslated server message'));
  console.log('PASS: edited advanced values, untouched policy preservation, fixed controls, NL/EN/DE labels and localized validation error.');
})().catch(error => { console.error(error); process.exitCode = 1; });

