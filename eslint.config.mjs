import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// AGENTS.md rules 3 & 4 — lint-enforced RTL + theme-token discipline.
// Scoped to app/** and components/**; lib/generate/** is the documented
// carve-out for the hex rule (Office brand hexes have no CSS variables).
const rtlAndThemeGuards = {
  files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
  ignores: ["lib/generate/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "Literal[value=/\\b(ml|mr|pl|pr)-/]",
        message:
          "use logical properties (ms-/me-/ps-/pe-) instead of physical direction utility classes",
      },
      {
        selector: "TemplateElement[value.raw=/\\b(ml|mr|pl|pr)-/]",
        message:
          "use logical properties (ms-/me-/ps-/pe-) instead of physical direction utility classes",
      },
      {
        selector: "Literal[value=/#[0-9a-fA-F]{3,8}/]",
        message: "use theme tokens from globals.css",
      },
      {
        selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
        message: "use theme tokens from globals.css",
      },
    ],
  },
};

export default defineConfig([
  globalIgnores([
    ".next/**",
    ".claude/worktrees/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    "coverage/**",
  ]),
  ...nextCoreWebVitals,
  ...nextTypescript,
  rtlAndThemeGuards,
]);
