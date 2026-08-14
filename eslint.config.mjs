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
    // One-off database inspection scripts, committed beside a feature and never
    // imported by the application. They were the only files outside src/ that
    // lint still reported, and every finding in them was about the shape of a
    // throwaway script rather than about the product. The files are left in
    // place: removing tracked files is a decision for their author, not a
    // side effect of quieting a linter.
    "tmp/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
