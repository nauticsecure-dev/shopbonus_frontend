const { spawnSync } = require("node:child_process");
const path = require("node:path");

// Production-only installs have no lint tooling to patch.
let eslintInstalled = false;
try {
  require.resolve("eslint/package.json");
  eslintInstalled = true;
} catch (error) {
  if (error.code !== "MODULE_NOT_FOUND") throw error;
}

if (eslintInstalled) {
  const manifest = require.resolve("patch-package/package.json");
  const patchPackage = require(manifest);
  const executable = typeof patchPackage.bin === "string"
    ? patchPackage.bin
    : patchPackage.bin["patch-package"];
  const result = spawnSync(process.execPath, [
    path.resolve(path.dirname(manifest), executable),
    "--error-on-fail",
  ], { stdio: "inherit" });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
