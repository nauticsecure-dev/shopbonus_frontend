const fs = require('fs');
const ts = require('typescript');
const http = require('http');
// Load the defaults and their local TypeScript dependencies in this fixture process.
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(source, filename);
};
const { mergeAboutUsContent } = require('../src/lib/aboutUsDefaults.ts');
http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1:8313');
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3313');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Headers', 'Accept, Accept-Language, Content-Type, X-XSRF-TOKEN');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    return response.end();
  }
  if (url.pathname === '/api/v1/content/over-ons') {
    const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'nl';
    const content = mergeAboutUsContent(null, locale);
    content.hero.heading = locale === 'en' ? 'Approved English publication' : 'Goedgekeurde publicatie';
    content.seo_title = locale === 'en' ? 'Approved English SEO' : 'Goedgekeurde SEO';
    response.end(JSON.stringify({ data: { content } }));
  } else if (url.pathname === '/api/v1/me') {
    response.statusCode = 401;
    response.end(JSON.stringify({ message: 'Unauthenticated.' }));
  } else response.end(JSON.stringify({ data: [] }));
}).listen(8313, '127.0.0.1');
