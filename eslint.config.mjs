// --- eslint.config.mjs (DEFINITIVE FINAL VERSION) ---
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// We start with the recommended Next.js rules
const eslintConfig = [...compat.extends("next/core-web-vitals")];

// --- THIS IS THE MASTERSTROKE ---
// We now add our own custom rule object to the configuration array.
eslintConfig.push({
  rules: {
    "react/no-unescaped-entities": "off",
  },
});
// --- END OF MASTERSTROKE ---

export default eslintConfig;