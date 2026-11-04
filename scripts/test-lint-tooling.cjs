const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { ESLint } = require("eslint");

// Exercise optional glob settings too: the normal application lint run does not
// visit every legacy plugin call site adapted by the minimatch 11 patches.
async function messages(rule, options, code, file = "src/tooling-smoke.tsx") {
  const eslint = new ESLint({
    overrideConfig: [{ rules: { [rule]: ["error", ...options] } }],
  });
  const [result] = await eslint.lintText(code, { filePath: file });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages.filter((message) => message.ruleId === rule);
}

test("Next, React, Hooks, accessibility and TypeScript rules remain loaded", async () => {
  const config = await new ESLint().calculateConfigForFile("src/tooling-smoke.tsx");
  for (const rule of [
    "@next/next/no-sync-scripts",
    "react/jsx-key",
    "react-hooks/rules-of-hooks",
    "jsx-a11y/alt-text",
    "import/no-anonymous-default-export",
  ]) {
    assert.ok(config.rules[rule][0] > 0, rule);
  }
  assert.match(config.languageOptions.parser.meta.name, /typescript-eslint/);
  assert.equal(config.rules["@next/next/no-img-element"][0], 0);
});

test("React glob ignores use the patched named minimatch export", async () => {
  assert.equal((await messages("react/jsx-pascal-case", [{ ignore: ["My_*"] }],
    "const view = <My_component />;")).length, 0);
  assert.equal((await messages("react/jsx-pascal-case", [{ ignore: ["other_*"] }],
    "const view = <My_component />;")).length, 1);
  assert.equal((await messages("react/no-danger", [{ customComponentNames: ["Html*"] }],
    'const view = <HtmlBlock dangerouslySetInnerHTML={{ __html: "hello" }} />;')).length, 1);
});

test("accessibility custom control and label globs still detect missing labels", async () => {
  const rule = "jsx-a11y/control-has-associated-label";
  const options = [{ controlComponents: ["ActionButton"] }];
  assert.equal((await messages(rule, options, "const view = <ActionButton />;")).length, 1);
  assert.equal((await messages(rule, options,
    'const view = <ActionButton aria-label="Save" />;')).length, 0);
  const labelRule = "jsx-a11y/label-has-associated-control";
  const labelOptions = [{ controlComponents: ["Input*"] }];
  assert.equal((await messages(labelRule, labelOptions,
    "const view = <label>Name<InputText /></label>;")).length, 0);
  assert.equal((await messages(labelRule, labelOptions,
    "const view = <label>Name</label>;")).length, 1);
});

test("import globs match ignored namespaces and side-effect imports", async () => {
  assert.equal((await messages("import/no-namespace", [{ ignore: ["allowed.js"] }],
    "import * as allowed from './allowed.js'; import * as blocked from './blocked.js';")).length, 1);
  assert.equal((await messages("import/no-unassigned-import", [{ allow: ["**/*.css"] }],
    "import './style.css'; import './blocked.js';")).length, 1);
});

test("internal import allow/forbid globs use matchers instead of removed makeRe", async () => {
  const rule = "import/no-internal-modules";
  assert.equal((await messages(rule, [{ forbid: ["**/internal/**"] }],
    "import secret from 'some-package/internal/secret';")).length, 1);
  assert.equal((await messages(rule, [{ forbid: ["**/internal/**"] }],
    "import publicApi from 'some-package/public/api';")).length, 0);
  // Use real installed modules so allow-list failures cannot disappear because
  // the import resolver could not find the package.
  assert.equal((await messages(rule, [{ allow: ["eslint/**"] }],
    "import api from 'eslint/package.json';")).length, 0);
  assert.equal((await messages(rule, [{ allow: ["other-package/**"] }],
    "import api from 'eslint/package.json';")).length, 1);
});

test("development dependency file globs still distinguish allowed imports", async () => {
  const rule = "import/no-extraneous-dependencies";
  const code = "import { ESLint } from 'eslint';";
  assert.equal((await messages(rule, [{ devDependencies: ["**/e2e/**"] }],
    code, "e2e/tooling-smoke.ts")).length, 0);
  assert.equal((await messages(rule, [{ devDependencies: ["**/e2e/**"] }], code)).length, 1);
});

test("generated preview and browser-report directories are ignored", async () => {
  const eslint = new ESLint();
  for (const file of [".next-voucher-review/server/page.js", "test-results-example/report.js",
    "playwright-report/index.js", ".consumer-acceptance/generated.js"]) {
    assert.equal(await eslint.isPathIgnored(path.resolve(file)), true, file);
  }
});

test("postinstall succeeds when production installs omit lint tooling", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "shopbonus-eslint-production-"));
  try {
    const script = path.join(directory, "apply-eslint-patches.cjs");
    fs.copyFileSync(path.join(__dirname, "apply-eslint-patches.cjs"), script);
    const result = spawnSync(process.execPath, [script], { cwd: directory, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  } finally {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("shopbonus-eslint-production-"));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
