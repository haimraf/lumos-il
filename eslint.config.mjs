import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Nested collaborator worktrees may contain their own source and build output.
    // They are separate checkouts, not part of this application's lint scope.
    ".claude/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
