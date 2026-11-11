const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");

const locales = ["nl", "en", "de"];
const hash = value => crypto.createHash("sha256").update(value).digest("hex");

function placeholders(value) {
  return (value.match(/\{[A-Za-z_][\w.]*\}|(?<!\w):[A-Za-z_][\w.]*|%\d*\$?[sdf]/g) || []).sort();
}

function flatten(value, prefix = "", result = {}) {
  for (const [key, child] of Object.entries(value)) {
    const name = prefix ? prefix + "." + key : key;
    if (typeof child === "string") result[name] = child;
    else if (child && typeof child === "object") flatten(child, name, result);
  }
  return result;
}

function compare(group, translations) {
  const values = Object.fromEntries(locales.map(locale => [locale, flatten(translations[locale])]));
  const keys = [...new Set(locales.flatMap(locale => Object.keys(values[locale])))].sort();
  return keys.flatMap(key => locales.map(locale => {
    const text = values[locale][key];
    const source = values.nl[key];
    const missing = typeof text !== "string" || !text.trim();
    const mismatch = !missing && typeof source === "string"
      && JSON.stringify(placeholders(source)) !== JSON.stringify(placeholders(text));
    return {
      id: group + ":" + locale + ":" + key,
      kind: "translation_key",
      source: group,
      locale,
      key,
      status: missing || mismatch ? "FAIL" : "UNTESTED",
      key_status: missing || mismatch ? "FAIL" : "PASS",
      reason: missing ? "missing_or_empty" : mismatch ? "placeholder_mismatch" : "key_and_placeholders_present",
      meaning_status: "UNTESTED",
    };
  }));
}

function hardcoded(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rows = [];
  function visit(node) {
    let value;
    if (ts.isJsxText(node)) value = node.text.replace(/\s+/g, " ").trim();
    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)
        && ["alt", "title", "placeholder", "aria-label"].includes(node.name.getText(source))) {
      value = node.initializer.text;
    }
    if (value && /\p{L}/u.test(value)) {
      rows.push({
        id: hash(file + ":" + node.getStart(source) + ":" + value),
        kind: "literal_ui_candidate",
        source: file,
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        text: value,
        status: "UNTESTED",
        reason: "review_translation_or_approved_exclusion",
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return rows;
}

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const child = path.join(directory, entry.name);
    return entry.isDirectory() ? files(child) : [child];
  }).sort();
}

function discover(root) {
  const i18n = path.join(root, "src", "i18n");
  const cache = new Map();
  function load(filename) {
    const full = path.resolve(i18n, filename);
    if (path.dirname(full) !== i18n || !full.endsWith(".ts")) throw new Error("Unexpected translation dependency");
    if (cache.has(full)) return cache.get(full);
    const output = ts.transpileModule(fs.readFileSync(full, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const translationModule = { exports: {} };
    const context = { module: translationModule, exports: translationModule.exports, require: name => load(name + ".ts") };
    vm.runInNewContext(output, context, { filename: full, timeout: 5000 });
    cache.set(full, translationModule.exports);
    return translationModule.exports;
  }
  const dictionaries = load("dictionaries.ts").dictionaries;
  const authCopy = load("authCopy.ts").authCopy;
  const rows = [
    ...compare("src/i18n/dictionaries.ts", dictionaries),
    ...compare("src/i18n/authCopy.ts", Object.fromEntries(locales.map(locale => [locale, authCopy(locale)]))),
    ...compare("src/i18n/contactCopy.ts", load("contactCopy.ts").contactCopy),
    ...compare("src/i18n/discoveryCopy.ts", load("discoveryCopy.ts").discoveryCopy),
  ];
  const sources = files(path.join(root, "src")).filter(file => /\.tsx?$/.test(file));
  const manifest = sources.map(file => {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const text = fs.readFileSync(file, "utf8");
    if (file.endsWith(".tsx")) rows.push(...hardcoded(relative, text));
    return { path: relative, sha256: hash(text) };
  });
  const keyRows = rows.filter(row => row.kind === "translation_key");
  const unclassified = files(i18n).filter(file => !cache.has(file)).map(file => ({
    id: path.relative(root, file).split(path.sep).join("/"),
    kind: "translation_module",
    status: "UNTESTED",
    reason: "not_evaluated_by_key_comparison",
  }));
  rows.push(...unclassified);
  return {
    generated_at: new Date().toISOString(),
    git_sha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8", windowsHide: true }).trim(),
    source_state: "working_tree",
    source_sha256: hash(JSON.stringify(manifest)),
    source_manifest: manifest,
    locales,
    evidence_complete: false,
    release_approved: false,
    key_comparison: {
      denominator: keyRows.length,
      passed: keyRows.filter(row => row.key_status === "PASS").length,
      failed: keyRows.filter(row => row.key_status === "FAIL").length,
    },
    limitations: [
      "Key presence and placeholder checks do not establish translation meaning.",
      "Literal candidates need classification and approved exclusions.",
      "Computed strings, dynamic bindings, backend messages, CMS records and mail require separate discovery and runtime proof.",
    ],
    items: rows,
  };
}

module.exports = { compare, hardcoded, discover };

if (require.main === module) {
  const outputIndex = process.argv.indexOf("--output");
  const report = discover(path.resolve(__dirname, ".."));
  if (outputIndex >= 0) {
    const output = process.argv[outputIndex + 1];
    if (!output) throw new Error("Provide an output path");
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  if (report.items.some(row => row.status === "FAIL")
      || (process.argv.includes("--strict") && report.items.some(row => row.status === "UNTESTED"))) {
    process.exitCode = 1;
  }
}
