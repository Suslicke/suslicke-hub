/**
 * i18n parity check: ru/en must expose an identical flattened key set.
 * Run via `pnpm check:messages`; exits non-zero on any mismatch.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const locales = ["ru", "en"];

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    value !== null && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

const keySets = new Map(
  locales.map((locale) => {
    const raw = readFileSync(join(root, "messages", `${locale}.json`), "utf8");
    return [locale, new Set(flatten(JSON.parse(raw)))];
  }),
);

let failed = false;
const [base, ...rest] = locales;
for (const locale of rest) {
  const baseKeys = keySets.get(base);
  const localeKeys = keySets.get(locale);
  const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !baseKeys.has(k));
  if (missing.length || extra.length) {
    failed = true;
    if (missing.length) {
      console.error(`[${locale}] missing keys:\n  ${missing.join("\n  ")}`);
    }
    if (extra.length) {
      console.error(`[${locale}] extra keys:\n  ${extra.join("\n  ")}`);
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log(
  `messages OK: ${locales
    .map((l) => `${l}=${keySets.get(l).size}`)
    .join(", ")} flat keys, identical sets`,
);
