// Dedicated local services. Never loads the developer's database/provider credentials.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
const backend = path.resolve(root, '../shopbonus_backend');
const runtime = path.join(root, '.consumer-acceptance');
const envFile = path.join(root, '.env.consumer-acceptance.local');
const php = process.env.CONSUMER_ACCEPTANCE_PHP || 'php';
const action = process.argv[2];
const apiOnly = process.argv.includes('--api-only');
const site = 'http://localhost:3038', api = 'http://localhost:8038';
fs.mkdirSync(runtime, { recursive: true });
if (!fs.existsSync(envFile)) {
  fs.writeFileSync(envFile, `# Generated local-only key; ignored by Git.\nAPP_KEY=base64:${crypto.randomBytes(32).toString('base64')}\n`, { flag: 'wx' });
}
const privateEnv = dotenv.parse(fs.readFileSync(envFile));
const defaults = dotenv.parse(fs.readFileSync(path.join(backend, '.env.example')));
const storage = path.join(runtime, 'storage');
const db = path.join(runtime, 'consumer.sqlite');
const env = { ...process.env, ...defaults,
  APP_KEY: privateEnv.APP_KEY, APP_ENV: 'local', APP_DEBUG: 'false', APP_URL: api, FRONTEND_URL: site,
  APP_CONFIG_CACHE: path.join(runtime, 'uncached-config.php'), LARAVEL_STORAGE_PATH: storage,
  DB_CONNECTION: 'sqlite', DB_DATABASE: db, DB_URL: '', DATABASE_URL: '',
  CACHE_STORE: 'file', SESSION_DRIVER: 'database', SESSION_COOKIE: 'shopbonus_consumer_acceptance',
  SESSION_DOMAIN: 'null', SESSION_SECURE_COOKIE: 'false', SESSION_SAME_SITE: 'lax',
  SANCTUM_STATEFUL_DOMAINS: 'localhost:3038,localhost:8038', CORS_ALLOWED_ORIGINS: site,
  CORS_SUPPORTS_CREDENTIALS: 'true', QUEUE_CONNECTION: 'database', BROADCAST_CONNECTION: 'log',
  MAIL_MAILER: 'smtp', MAIL_SCHEME: 'smtp', MAIL_URL: 'smtp://127.0.0.1:1038', MAIL_HOST: '127.0.0.1', MAIL_PORT: '1038',
  MAIL_USERNAME: '', MAIL_PASSWORD: '', MAIL_FROM_ADDRESS: 'acceptance@shopbonus.test',
  NOTIFICATION_EMAIL_ENABLED: 'true', NOTIFICATION_AI_ENABLED: 'false',
  ANSWER24_DISPATCH_ENABLED: 'false', INTEGRATION_SYNC_ENABLED: 'false', TRADETRACKER_API_ENABLED: 'false',
  TELESCOPE_ENABLED: 'false', NIGHTWATCH_ENABLED: 'false', PULSE_ENABLED: 'false', XDEBUG_MODE: 'off',
  NEXT_PUBLIC_API_BASE_URL: api, NEXT_PUBLIC_APP_URL: site, NEXT_PUBLIC_USE_COOKIE_AUTH: 'true',
  SHOPBONUS_NEXT_DIST_DIR: '.next-consumer-acceptance',
  CONSUMER_ACCEPTANCE_DATABASE: db,
  MP_DISABLE_VERSION_CHECK: 'true',
};
// Empty any provider credentials absent from .env.example as well.
for (const key of Object.keys(env)) {
  if (/^(MOLLIE|MONEYBIRD|DAISYCON|TRADETRACKER|ANSWER24|OPENAI).*?(KEY|TOKEN|SECRET|PASSWORD)$/.test(key)) env[key] = '';
}
function artisan(args) {
  const result = spawnSync(php, ['-d', 'xdebug.mode=off', 'artisan', ...args], { cwd: backend, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Artisan ${args[0]} failed (${result.status}).`);
}
async function check() {
  let failed = false;
  for (const [name, url] of [['API', api + '/api/v1/health'], ...(!apiOnly ? [['Frontend', site + '/account']] : []), ['Mailbox', 'http://127.0.0.1:8039/api/v1/info']]) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log(`${name}: READY (${url})`);
    } catch (error) { failed = true; console.error(`${name}: NOT READY (${error.message})`); }
  }
  if (failed) process.exitCode = 1;
}
async function main() {
  if (action === 'setup') {
    for (const dir of ['app/private', 'app/public', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs']) fs.mkdirSync(path.join(storage, dir), { recursive: true });
    if (!fs.existsSync(db)) fs.closeSync(fs.openSync(db, 'wx'));
    artisan(['migrate', '--force', '--no-interaction']);
    const seeded = path.join(runtime, 'demo-seeded');
    if (!fs.existsSync(seeded)) {
      artisan(['db:seed', '--class=DemoUsersAndShopsSeeder', '--force', '--no-interaction']);
      fs.writeFileSync(seeded, new Date().toISOString(), { flag: 'wx' });
    }
    const result = spawnSync(php, ['-d', 'xdebug.mode=off', 'scripts/consumer-acceptance-fixtures.php'], { cwd: backend, env, stdio: 'inherit', windowsHide: true });
    if (result.error || result.status !== 0) throw result.error || new Error('Consumer fixture setup failed.');
    console.log('Local environment initialized. Run: node scripts/consumer-acceptance.cjs start');
  } else if (action === 'check') await check();
  else if (action === 'start' || action === 'ui') {
    const mailpit = path.join(runtime, 'mailpit.exe');
    if (!fs.existsSync(db) || (action === 'start' && !fs.existsSync(mailpit))) throw new Error('Run setup and install-consumer-mailpit.ps1 first.');
    const children = [];
    let stopping = false;
    function stop(code = 0) {
      if (stopping) return;
      stopping = true;
      for (const child of children) child.kill();
      process.exitCode = code;
    }
    function service(command, args, cwd) {
      const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: 'inherit' });
      children.push(child);
      child.on('error', error => { console.error(error.message); stop(1); });
      child.on('exit', code => { if (!stopping) { console.error(`Service exited (${code}); stopping acceptance services.`); stop(1); } });
    }
    if (action === 'start') {
      service(mailpit, ['--listen', '127.0.0.1:8039', '--smtp', '127.0.0.1:1038', '--database', path.join(runtime, 'mailpit.db')], root);
      service(php, ['-d', 'xdebug.mode=off', '-S', '127.0.0.1:8038', '-t', 'public', 'public/index.php'], backend);
      service(php, ['-d', 'xdebug.mode=off', 'artisan', 'queue:work', '--sleep=1', '--tries=3', '--timeout=60'], backend);
    }
    if (action === 'ui' || !apiOnly) service(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3038'], root);
    process.on('SIGINT', () => stop());
    process.on('SIGTERM', () => stop());
    console.log(`Consumer UI: ${apiOnly ? 'not started (--api-only)' : site}\nAPI: ${api}\nLocal mailbox: http://localhost:8039\nUse localhost consistently for cookie authentication.`);
  } else throw new Error('Usage: node scripts/consumer-acceptance.cjs setup|start|ui|check [--api-only]');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
