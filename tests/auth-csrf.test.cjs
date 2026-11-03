const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture({ cookie = '', supportToken = null, bootstrapStatus = 204, setCookie = true, statuses = [200] } = {}) {
  const calls = [], document = { cookie };
  let bootstraps = 0, mutations = 0;
  const modules = {};
  function load(file, mocks) {
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name],
      document, window: {}, FormData, Headers, fetch: async (url, options) => {
        calls.push({ url, ...options });
        if (url.endsWith('/sanctum/csrf-cookie')) {
          bootstraps++;
          if (setCookie && bootstrapStatus === 204) document.cookie = `XSRF-TOKEN=fresh%3D${bootstraps}`;
          return new Response(null, { status: bootstrapStatus });
        }
        return new Response(JSON.stringify({ data: { email: 'fixture@example.test' } }), {
          status: statuses[Math.min(mutations++, statuses.length - 1)],
        });
      } });
    return module.exports;
  }
  modules.api = load('src/lib/api.ts', {
    '@/config/env': { env: { useCookieAuth: true }, apiUrl: path => `http://api.test${path}` },
    '@/lib/supportSession': { getSupportToken: () => supportToken },
    '@/types/locale': { DEFAULT_LOCALE: 'nl', normalizeLocale: value => value || 'nl' },
  });
  modules.auth = load('src/lib/auth.ts', { '@/lib/api': modules.api });
  return { ...modules, calls, document, bootstraps: () => bootstraps };
}

test('registration initializes CSRF once, decodes token and includes session credentials', async () => {
  const f = fixture({ statuses: [201] });
  await f.auth.registerAccount({ first_name: 'Test' }, 'en');
  assert.equal(f.bootstraps(), 1);
  assert.equal(f.calls[1].headers['X-XSRF-TOKEN'], 'fresh=1');
  assert.equal(f.calls[1].credentials, 'include');
  assert.equal(f.calls[1].headers['Accept-Language'], 'en');
});

test('parallel mutations share initial CSRF bootstrap', async () => {
  const f = fixture();
  await Promise.all([f.api.apiRequest({ path: '/register', method: 'POST' }), f.api.apiRequest({ path: '/login', method: 'POST' })]);
  assert.equal(f.bootstraps(), 1);
});

test('parallel initial reads and registration share one anonymous cookie session', async () => {
  const f = fixture();
  await Promise.all([
    f.api.apiRequest({ path: '/api/v1/me' }),
    f.api.apiRequest({ path: '/api/v1/public/legal-requirements' }),
    f.auth.registerAccount({}, 'nl'),
  ]);
  assert.equal(f.bootstraps(), 1);
  assert.ok(f.calls.slice(1).every(call => call.headers['X-XSRF-TOKEN'] === 'fresh=1'));
});

test('an existing cookie avoids unnecessary bootstrap requests', async () => {
  const f = fixture({ cookie: 'XSRF-TOKEN=current' });
  await f.auth.loginAccount('fixture@example.test', 'password', 'nl');
  assert.equal(f.bootstraps(), 0);
});

test('419 forces fresh CSRF and retries logout exactly once', async () => {
  const f = fixture({ cookie: 'XSRF-TOKEN=stale', statuses: [419, 200] });
  await f.auth.logoutAccount('nl');
  assert.equal(f.calls.filter(call => call.url.endsWith('/logout')).length, 2);
  assert.equal(f.calls[0].headers['X-XSRF-TOKEN'], 'stale');
  assert.equal(f.calls[2].headers['X-XSRF-TOKEN'], 'fresh=1');
});

for (const status of [419, 403, 500]) {
  test(`failed logout (${status}) rejects so SessionContext retains its session`, async () => {
    const f = fixture({ cookie: 'XSRF-TOKEN=current', statuses: [status] });
    await assert.rejects(f.auth.logoutAccount(), error => error.status === status);
    assert.equal(f.calls.filter(call => call.url.endsWith('/logout')).length, status === 419 ? 2 : 1);
  });
}

test('401 confirms an already absent session', async () => {
  await fixture({ statuses: [401] }).auth.logoutAccount();
});

test('failed CSRF bootstrap prevents submission and allows a subsequent attempt', async () => {
  const f = fixture({ bootstrapStatus: 503 });
  for (let attempt = 0; attempt < 2; attempt++) {
    await assert.rejects(f.auth.registerAccount({}, 'nl'), error => error.code === 'csrf_initialization_failed');
  }
  assert.equal(f.calls.length, 2);
});

test('unreadable cookie reports a configuration error before registration', async () => {
  const f = fixture({ setCookie: false });
  await assert.rejects(f.auth.registerAccount({}, 'nl'), error => error.code === 'csrf_cookie_unavailable');
  assert.equal(f.calls.length, 1);
});

test('a 401 from CSRF bootstrap does not confirm logout', async () => {
  const f = fixture({ bootstrapStatus: 401 });
  await assert.rejects(f.auth.logoutAccount(), error => error.code === 'csrf_initialization_failed');
});

test('a CSRF bootstrap 401 is not interpreted as an unauthenticated me response', async () => {
  const f = fixture({ bootstrapStatus: 401 });
  await assert.rejects(f.auth.fetchMe(), error => error.code === 'csrf_initialization_failed');
});

test('SessionContext preserves identity after failed logout and clears it after confirmed logout', async () => {
  const f = fixture({ cookie: 'XSRF-TOKEN=current', statuses: [419, 419, 200] });
  const state = [];
  let cursor = 0, value;
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], next => { state[index] = next; }];
    },
    useCallback: callback => callback,
    useMemo: callback => callback(),
    useEffect: () => {},
  };
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/store/SessionContext.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mocks = { react, 'react/jsx-runtime': { jsx: (_type, props) => { value = props.value; } },
    '@/lib/auth': f.auth, '@/i18n/LocaleContext': { useLocale: () => ({ locale: 'nl', applyAccountLocale() {} }) } };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name] });
  const render = () => { cursor = 0; module.exports.SessionProvider({ children: null }); };
  render();
  value.setUser({ email: 'fixture@example.test', role: 'consumer', roles: [] });
  render();
  await assert.rejects(value.signOut(), error => error.status === 419);
  assert.equal(state[0].email, 'fixture@example.test');
  await value.signOut();
  assert.equal(state[0], null);
});

test('multipart upload shares CSRF retry and preserves browser boundary', async () => {
  const f = fixture({ statuses: [419, 200] });
  const formData = new FormData();
  formData.append('name', 'fixture');
  await f.api.apiUpload({ path: '/upload', formData });
  const uploads = f.calls.filter(call => call.url.endsWith('/upload'));
  assert.equal(uploads.length, 2);
  assert.equal(uploads[1].body, formData);
  assert.equal(uploads[1].headers['Content-Type'], undefined);
});

test('support bearer requests omit cookies and never bootstrap or retry CSRF', async () => {
  const f = fixture({ supportToken: 'synthetic', statuses: [419] });
  await assert.rejects(f.api.apiUpload({ path: '/upload', formData: new FormData() }));
  assert.equal(f.bootstraps(), 0);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].credentials, 'omit');
  assert.equal(f.calls[0].headers.Authorization, 'Bearer synthetic');
  assert.equal(f.calls[0].headers['X-XSRF-TOKEN'], undefined);
});
