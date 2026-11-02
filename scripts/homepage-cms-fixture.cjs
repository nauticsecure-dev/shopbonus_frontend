const fs = require('fs');
const ts = require('typescript');
const http = require('http');
const mod = { exports: {} };
const source = ts.transpileModule(fs.readFileSync('src/lib/homepageDefaults.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function('exports', 'module', source)(mod.exports, mod);
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:8013');
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3013');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  if (url.pathname === '/api/v1/content/homepage') {
    const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'nl';
    const content = mod.exports.mergeHomepageContent(null, locale);
    content.hero.heading = locale === 'en' ? 'Approved English publication' : 'Goedgekeurde publicatie';
    content.seo_title = locale === 'en' ? 'Approved English SEO' : 'Goedgekeurde SEO';
    response.end(JSON.stringify({ data: { content } }));
  } else { response.end(JSON.stringify({ data: [] })); }
}).listen(8013, '127.0.0.1', () => process.stdout.write('Homepage CMS fixture ready\n'));
