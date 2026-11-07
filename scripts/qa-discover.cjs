const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const cwd = path.resolve(__dirname, "..");
const git = (args, input) => execFileSync("git", args, { cwd, input, maxBuffer: 64 * 1024 * 1024 });
const categories = ["routes", "actions", "components", "ui_states"];
const routeFile = /(?:^|\/)(page|route)\.[jt]sx?$/;
const stateFile = /(?:^|\/)(loading|error|global-error|not-found|forbidden|unauthorized|default)\.[jt]sx?$/;
const stateName = /loading|pending|error|empty|success|status|submitting|disabled|busy|state/i;
const interaction = /^on[A-Z]|^(?:action|formAction)$/;

function discover() {
  const git_sha = git(["rev-parse", "HEAD"]).toString().trim();
  const files = git(["ls-tree", "-rz", git_sha, "--", "src"]).toString().split("\0")
    .filter(Boolean)
    .map((line) => {
      const tab = line.indexOf("\t");
      return { sha: line.slice(0, tab).split(" ")[2], file: line.slice(tab + 1) };
    })
    .filter(({ file }) => /\.[jt]sx?$/.test(file) && !file.endsWith(".d.ts"));
  const blobs = git(["cat-file", "--batch"], files.map(({ sha }) => sha).join("\n") + "\n");
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
    if (file.startsWith("src/app/")) {
      if (routeFile.test(file)) inventory.routes.add(file);
      if (stateFile.test(file)) inventory.ui_states.add(file);
    }
    function add(kind, node, name) {
      const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
      inventory[kind].add(`${file}:${line + 1}:${character + 1}:${name}`);
    }
    function visit(node) {
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
      if (ts.isVariableDeclaration(node) && stateName.test(node.name.getText(source))) {
        add("ui_states", node, node.name.getText(source));
      }
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
  return { git_sha, ...Object.fromEntries(categories.map((kind) => [kind, [...inventory[kind]].sort()])) };
}

const inventory = discover();
if (process.argv.length === 2) {
  console.log(JSON.stringify({ ...inventory, verification: "static_candidates" }, null, 2));
} else {
  const [, , flag, reviewPath] = process.argv;
  if (flag !== "--verify" || !reviewPath || process.argv.length !== 4) {
    throw new Error("Usage: node scripts/qa-discover.cjs [--verify reviewed-inventory.json]");
  }
  const review = JSON.parse(readFileSync(reviewPath, "utf8"));
  if (review.git_sha !== inventory.git_sha) throw new Error("Review must target the exact frontend Git commit.");
  const verified = { git_sha: inventory.git_sha };
  for (const kind of categories) {
    const entries = review[kind];
    if (!Array.isArray(entries) || entries.length === 0) throw new Error(`Missing review entries for ${kind}.`);
    const dispositions = new Map();
    for (const { id, decision, reference } of entries) {
      if (typeof id !== "string" || !id.trim() || dispositions.has(id) ||
          !["covered", "excluded"].includes(decision) || typeof reference !== "string" || !reference.trim()) {
        throw new Error(`Invalid or duplicate ${kind} disposition for ${id}.`);
      }
      dispositions.set(id, decision);
    }
    const missing = inventory[kind].filter((id) => !dispositions.has(id));
    if (missing.length) throw new Error(`Unreviewed ${kind} (showing up to 10): ${missing.slice(0, 10).join(", ")}`);
    verified[kind] = [...dispositions].filter(([, decision]) => decision === "covered").map(([id]) => id).sort();
    if (!verified[kind].length) throw new Error(`No covered ${kind} recorded.`);
  }
  console.log(JSON.stringify({ ...verified, verification: "reviewed_candidate_dispositions" }, null, 2));
}
