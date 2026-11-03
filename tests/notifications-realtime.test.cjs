const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture() {
  const listeners = new Map(), subscribed = [];
  let leaves = 0, channels = 0;
  const channel = {
    listen(event, callback) { listeners.set(event, callback); return this; },
    stopListening(event) { listeners.delete(event); },
    subscribed(callback) { subscribed.push(callback); },
  };
  const echo = { private() { channels++; return channel; }, leave() { leaves++; } };
  const mocks = {
    '@/config/env': { env: { reverbKey: 'fixture', reverbHost: 'localhost' }, apiUrl: p => p },
    '@/lib/api': { ensureCsrfCookie: async () => {} },
    'laravel-echo': { default: class { constructor() { return echo; } } },
    'pusher-js': { default: class {} },
  };
  const code = ts.transpileModule(fs.readFileSync('src/lib/echo.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name], window: {}, document: { cookie: '' } });
  return { api: module.exports, listeners, subscribed, leaves: () => leaves, channels: () => channels };
}

test('two concurrent consumers share listeners; disposing one preserves the other and cleanup is idempotent', async () => {
  const f = fixture(), a = [], b = [];
  const [offA, offB] = await Promise.all([
    f.api.subscribeNotifications('user', (...event) => a.push(event)),
    f.api.subscribeNotifications('user', (...event) => b.push(event)),
  ]);
  assert.equal(f.channels(), 1);
  f.listeners.get('.NotificationCreated')({ notification_id: 'first' });
  assert.equal(a.length, 1); assert.equal(b.length, 1);
  offA(); offA();
  assert.equal(f.leaves(), 0);
  f.listeners.get('.NotificationRead')({ notification_id: 'second' });
  assert.equal(a.length, 1); assert.equal(b.length, 2);
  offB(); offB();
  assert.equal(f.leaves(), 1); assert.equal(f.listeners.size, 0);
});

test('subscription acknowledgements recover HTTP state after initial authorization and reconnect for every active consumer', async () => {
  const f = fixture(); let a = 0, b = 0;
  const offA = await f.api.subscribeNotifications('user', () => {}, () => a++);
  const offB = await f.api.subscribeNotifications('user', () => {}, () => b++);
  f.subscribed[0](); // initial acknowledgement
  f.subscribed[0](); // reconnect subscription acknowledgement
  assert.equal(a, 2); assert.equal(b, 2);
  offA(); f.subscribed[0]();
  assert.equal(a, 2); assert.equal(b, 3);
  offB(); f.subscribed[0]();
  assert.equal(b, 3);
});

test('users have separate channels and a stale disposer cannot remove a replacement subscription', async () => {
  const f = fixture();
  const first = await f.api.subscribeNotifications('user', () => {});
  first();
  const second = await f.api.subscribeNotifications('user', () => {});
  const other = await f.api.subscribeNotifications('other', () => {});
  first(); assert.equal(f.leaves(), 1);
  second(); assert.equal(f.leaves(), 2);
  other(); assert.equal(f.leaves(), 3);
});
