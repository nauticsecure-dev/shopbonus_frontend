const fs = require('fs');
const ts = require('typescript');
const http = require('http');
const mod = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync('src/lib/aboutUsDefaults.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mod.exports, mod);
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:8313');
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3313');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  if (url.pathname === '/api/v1/content/over-ons') {
    const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'nl';
    const content = mod.exports.mergeAboutUsContent(null, locale);
    content.hero.heading = locale === 'en' ? 'Approved English publication' : 'Goedgekeurde publicatie';
    content.seo_title = locale === 'en' ? 'Approved English SEO' : 'Goedgekeurde SEO';
    response.end(JSON.stringify({ data: { content } }));
  } else response.end(JSON.stringify({ data: [] }));
}).listen(8313, '127.0.0.1');
