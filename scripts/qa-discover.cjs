const { execFileSync } = require("node:child_process");
const { readFileSync, realpathSync, statSync } = require("node:fs");
const { createHash } = require("node:crypto");
const path = require("node:path");
const ts = require("typescript");

const cwd = path.resolve(__dirname, "..");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const categories = ["routes", "actions", "components", "ui_states"];
const routeFile = /(?:^|\/)(page|route)\.[jt]sx?$/;
const stateFile = /(?:^|\/)(loading|error|global-error|not-found|forbidden|unauthorized|default)\.[jt]sx?$/;
const stateName = /loading|pending|error|empty|success|status|submitting|disabled|busy|state/i;
const interaction = /^on[A-Z]|^(?:action|formAction)$/;

function discover(root = cwd) {
  const git = (args, input) => execFileSync("git", args, { cwd: root, input, maxBuffer: 64 * 1024 * 1024 });
  const git_sha = git(["rev-parse", "HEAD"]).toString().trim();
  const files = git(["ls-tree", "-rz", git_sha, "--", "src"]).toString().split("\0")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      return { sha: line.slice(0, tab).split(" ")[2], file: line.slice(tab + 1) };
    })
    .filter(({ file }) => /\.[jt]sx?$/.test(file) && !file.endsWith(".d.ts"));
  const blobs = git(["cat-file", "--batch"], files.map(({ sha }) => sha).join("\n") + "\n");
  const source_sha256 = digest(JSON.stringify(files));
  const inventory = Object.fromEntries(categories.map((name) => [name, new Set()]));
  let offset = 0;
  for (const { file, sha } of files) {
    const end = blobs.indexOf(10, offset);
    const [actual, type, size] = blobs.toString("ascii", offset, end).split(" ");
    if (actual !== sha || type !== "blob" || !/^\d+$/.test(size)) throw new Error(`Unreadable Git source ${file}`);
    offset = end + 1;
    const text = blobs.toString("utf8", offset, offset + Number(size));
    offset += Number(size) + 1;
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${file}`);
    if (/\.[jt]sx$/.test(file)) inventory.components.add(file + ":module");
    if (file.startsWith("src/app/")) {
      if (routeFile.test(file)) inventory.routes.add(file);
      if (stateFile.test(file)) inventory.ui_states.add(file);
    }
    function add(kind, node, name) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
      inventory[kind].add(`${file}:${line + 1}:${character + 1}:${name}`);
    }
    function visit(node) {
      if (ts.isJsxSpreadAttribute(node)) add("actions", node, "dynamic-spread-props");
      if (ts.isCallExpression(node)) {
        const called = node.expression.getText(source);
        if (/(?:^|\.)(addEventListener|push|replace|navigate|redirect|dispatch|mutate)$/.test(called)) add("actions", node, called);
        if (/(?:^|\.)(createElement|lazy)$/.test(called)) {
          add("components", node, "dynamic:" + called);
          add("actions", node, "dynamic-factory:" + called);
          add("ui_states", node, "dynamic-factory:" + called);
        }
      }
      if (ts.isJsxAttribute(node) && /^(?:disabled|hidden|aria-(?:busy|expanded|hidden|selected|checked)|className)$/.test(node.name.getText(source))) add("ui_states", node, "attribute:" + node.name.getText(source));
      if (ts.isJsxAttribute(node) && interaction.test(node.name.getText(source))) {
        add("actions", node, node.name.getText(source));
      }
      if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === "use server") {
        add("actions", node, "use server");
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        if (/^[A-Z]/.test(tag)) add("components", node, tag);
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        if (["a", "button", "form", "input", "select", "textarea", "Link"].includes(tag)) add("actions", node, "interactive:" + tag);
      }
      if (ts.isVariableDeclaration(node) && (stateName.test(node.name.getText(source)) ||
          (node.initializer && ts.isCallExpression(node.initializer) && /(?:^|\.)(useState|useReducer|useTransition|useActionState|useOptimistic)$/.test(node.initializer.expression.getText(source))))) {
        add("ui_states", node, node.name.getText(source));
      }
      if (ts.isIfStatement(node) || ts.isSwitchStatement(node) || ts.isConditionalExpression(node)) add("ui_states", node, "branch");
      if (ts.isJsxExpression(node) && node.expression &&
          (ts.isConditionalExpression(node.expression) || ts.isBinaryExpression(node.expression))) {
        add("ui_states", node, "conditional render");
      }
      if (ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
        if (node.name && /^[A-Z][a-zA-Z0-9]*$/.test(node.name.getText(source)) && /\.[jt]sx$/.test(file)) {
          add("components", node, node.name.getText(source));
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { schema_version: 2, git_sha, source_sha256, ...Object.fromEntries(categories.map((kind) => [kind, [...inventory[kind]].sort()])) };
}

/** Completeness is checked against every tracked candidate, with same-build browser observations.
 * This validates evidence bindings; an independent reviewer still assesses the actual behavior.
 */
function verify(inventory, review, evidenceRoot) {
  if (review.schema_version !== 2 || review.git_sha !== inventory.git_sha || review.source_sha256 !== inventory.source_sha256) {
    throw new Error("Review must target the exact frontend Git commit and source fingerprint.");
  }
  if (typeof review.review_reference !== "string" || !review.review_reference.trim()) throw new Error("Independent review reference required.");
  if (!Array.isArray(review.contexts) || !review.contexts.length) throw new Error("Browser runtime contexts are required.");
  const contexts = new Map();
  const root = realpathSync(evidenceRoot);
  for (const context of review.contexts) {
    if (typeof context.id !== "string" || !context.id.trim() || contexts.has(context.id) || context.git_sha !== inventory.git_sha ||
        !["nl", "en", "de"].includes(context.locale) || typeof context.actor_role !== "string" || !context.actor_role.trim() ||
        typeof context.ui_state !== "string" || !context.ui_state.trim() || !/^\/(?!\/)/.test(context.route ?? "") ||
        !Number.isInteger(context.viewport?.width) || context.viewport.width < 1 || !Number.isInteger(context.viewport?.height) || context.viewport.height < 1 ||
        typeof context.test_key !== "string" || !context.test_key.trim() || typeof context.run_id !== "string" || !context.run_id.trim() ||
        typeof context.result_id !== "string" || !context.result_id.trim() || !Number.isInteger(context.case_version) || context.case_version < 1) throw new Error("Invalid or duplicate runtime context.");
    for (const kind of ["screenshot", "trace"]) {
      const artifact = context.evidence?.[kind];
      if (!artifact || typeof artifact.path !== "string" || path.isAbsolute(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256 ?? "")) throw new Error("Missing browser " + kind + " evidence.");
      const file = realpathSync(path.resolve(root, artifact.path));
      const stat = statSync(file);
      if (!file.startsWith(root + path.sep) || !stat.isFile() || stat.size < 1 || stat.size > 10 * 1024 * 1024 || digest(readFileSync(file)) !== artifact.sha256) throw new Error("Browser evidence is missing, changed or outside the evidence directory.");
    }
    for (const kind of categories) {
      if (!Array.isArray(context.observed?.[kind]) || new Set(context.observed[kind]).size !== context.observed[kind].length || context.observed[kind].some(id => !inventory[kind].includes(id))) throw new Error("Unknown or duplicate runtime observations for " + kind);
    }
    contexts.set(context.id, context);
  }
  const verified = { schema_version: 2, git_sha: inventory.git_sha, source_sha256: inventory.source_sha256, review_reference: review.review_reference };
  for (const kind of categories) {
    const entries = review[kind];
    if (!Array.isArray(entries) || entries.length !== inventory[kind].length) throw new Error("Incomplete or additional dispositions for " + kind);
    const seen = new Set();
    for (const entry of entries) {
      if (!inventory[kind].includes(entry.id) || seen.has(entry.id) || !["covered", "excluded"].includes(entry.decision) || typeof entry.reference !== "string" || !entry.reference.trim()) throw new Error("Invalid, unknown or duplicate " + kind + " disposition.");
      seen.add(entry.id);
      if (entry.decision === "covered" && (!Array.isArray(entry.context_ids) || !entry.context_ids.length || new Set(entry.context_ids).size !== entry.context_ids.length || entry.context_ids.some(id => !contexts.get(id)?.observed[kind].includes(entry.id)))) throw new Error("Covered " + kind + " has no matching browser observation.");
    }
    verified[kind] = entries.filter(entry => entry.decision === "covered").map(entry => entry.id).sort();
    if (!verified[kind].length) throw new Error("No covered " + kind + " recorded.");
  }
  return { ...verified, source_candidates: Object.fromEntries(categories.map(kind => [kind, inventory[kind]])), dispositions: Object.fromEntries(categories.map(kind => [kind, review[kind]])), contexts: review.contexts.map(context => ({ ...context, evidence: Object.fromEntries(Object.entries(context.evidence).map(([kind, artifact]) => [kind, { sha256: artifact.sha256 }])) })), verification: "reviewed_runtime_dispositions", candidate_coverage_complete: true, evidence_complete: false, release_approved: false };
}

module.exports = { discover, verify };
if (require.main === module) {
  const inventory = discover();
  if (process.argv.length === 2) console.log(JSON.stringify({ ...inventory, verification: "static_candidates", evidence_complete: false }, null, 2));
  else {
    const [, , flag, reviewPath] = process.argv;
    if (flag !== "--verify" || !reviewPath || process.argv.length !== 4) throw new Error("Usage: node scripts/qa-discover.cjs [--verify reviewed-inventory.json]");
    console.log(JSON.stringify(verify(inventory, JSON.parse(readFileSync(reviewPath, "utf8")), path.dirname(path.resolve(reviewPath))), null, 2));
  }
}
