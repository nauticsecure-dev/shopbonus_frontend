const { test } = require("node:test");
const assert = require("node:assert/strict");
const { compare, hardcoded } = require("../scripts/qa-i18n.cjs");

test("translation audit detects missing keys, empty text and changed placeholders", () => {
  const items = compare("fixture", {
    nl: { available: "{balance} beschikbaar", binding: "Webshop" },
    en: { available: "{amount} available" },
    de: { available: "{balance} verfügbar", binding: "" },
  });
  assert.equal(items.find(row => row.locale === "en" && row.key === "available").reason, "placeholder_mismatch");
  assert.equal(items.find(row => row.locale === "en" && row.key === "binding").status, "FAIL");
  assert.equal(items.find(row => row.locale === "de" && row.key === "binding").status, "FAIL");
});

test("translation audit discovers hardcoded JSX and accessible labels", () => {
  const source = '<main><h1>Injected English</h1><input aria-label="Untranslated input" placeholder="Search"/></main>';
  const items = hardcoded("fixture.tsx", source);
  assert.deepEqual(items.map(row => row.text), ["Injected English", "Untranslated input", "Search"]);
  assert(items.every(row => row.status === "UNTESTED"));
});
