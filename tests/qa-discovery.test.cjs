const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { discover, verify } = require('../scripts/qa-discover.cjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('discovery covers hooks, intrinsic actions, branches and routes from committed source', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shopbonus-discovery-'));
  try {
    fs.mkdirSync(path.join(root, 'src/app/(public)/shop/[id]'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src/app/(public)/shop/[id]/page.tsx'), 'export default function Shop(){ const [n,setN]=useState(0); if(n<0)return null; return <form><button onClick={()=>setN(n+1)}>Save</button><Link href="/">Back</Link>{n ? <Card/> : null}</form>; }');
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=QA Fixture', '-c', 'user.email=qa@example.test', 'commit', '-qm', 'Synthetic source'], { cwd: root });
    const found = discover(root);
    assert.equal(found.routes.length, 1);
    assert(found.actions.some(id => id.endsWith('interactive:button')));
    assert(found.actions.some(id => id.endsWith('onClick')));
    assert(found.components.some(id => id.endsWith(':Card')));
    assert(found.components.some(id => id.endsWith(':module')));
    assert(found.ui_states.some(id => id.endsWith(':[n,setN]')));
    assert(found.ui_states.some(id => id.endsWith(':branch')));
    const before = found.source_sha256;
    fs.writeFileSync(path.join(root, 'src/app/(public)/shop/[id]/page.tsx'), 'export default function Shop(){return <a href="/">New</a>}');
    assert.equal(discover(root).source_sha256, before, 'uncommitted bytes cannot impersonate a deployed build');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('runtime verification rejects subset inventories, stale builds, unobserved coverage and changed artifacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shopbonus-discovery-proof-'));
  try {
    fs.writeFileSync(path.join(root, 'screen.png'), 'synthetic screenshot bytes');
    fs.writeFileSync(path.join(root, 'trace.zip'), 'synthetic trace bytes');
    const inventory = { schema_version: 2, git_sha: 'a'.repeat(40), source_sha256: 'b'.repeat(64), routes: ['route1'], actions: ['action1'], components: ['component1'], ui_states: ['state1'] };
    const observed = Object.fromEntries(['routes','actions','components','ui_states'].map(kind => [kind, inventory[kind]]));
    const review = { ...inventory, review_reference: 'Synthetic independent review', contexts: [{ case_version: 1, id: 'context1', git_sha: inventory.git_sha, locale: 'en', actor_role: 'consumer', ui_state: 'loaded', route: '/shop/1', viewport: { width: 390, height: 844 }, test_key: 'Synthetic::journey', run_id: 'run1', result_id: 'result1', observed, evidence: { screenshot: { path: 'screen.png', sha256: hash('synthetic screenshot bytes') }, trace: { path: 'trace.zip', sha256: hash('synthetic trace bytes') } } }], ...Object.fromEntries(Object.keys(observed).map(kind => [kind, inventory[kind].map(id => ({ id, decision: 'covered', reference: 'Synthetic proof', context_ids: ['context1'] }))])) };
    assert.equal(verify(inventory, review, root).release_approved, false);
    for (const mutate of [r => r.routes.pop(), r => r.actions.push({ id: 'invented', decision: 'covered' }), r => r.git_sha = 'c'.repeat(40), r => r.contexts[0].observed.actions = [], r => r.components[0].context_ids = [], r => r.source_sha256 = 'd'.repeat(64)]) {
      const changed = structuredClone(review); mutate(changed); assert.throws(() => verify(inventory, changed, root));
    }
    fs.writeFileSync(path.join(root, 'trace.zip'), 'changed');
    assert.throws(() => verify(inventory, review, root), /evidence/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
