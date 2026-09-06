---
version: 1
project:
  name: guardrail-example-nextjs
rules:
  - id: no-cross-feature-imports
    description: Features must not import from each other directly; share code through packages/shared instead.
    severity: error
    scope: ["src/features/**/*.ts", "src/features/**/*.tsx"]
    enforcement:
      type: import-boundary
      deny: ["src/features/*/*"]
  - id: no-secrets
    description: No hardcoded credentials or API keys anywhere in the repo.
    severity: critical
    scope: ["**/*.ts", "**/*.tsx", "**/*.env*"]
    enforcement:
      type: secret-scan
  - id: no-moment
    description: Use date-fns instead of the deprecated moment.js.
    severity: warning
    scope: ["package.json"]
    enforcement:
      type: forbidden-dependency
      deny: ["moment"]
---

# Guardrail Example — Next.js

This fixture repo intentionally plants one violation of `no-cross-feature-imports`
(`src/features/billing/index.ts` imports directly from `src/features/auth/session.ts`)
so `guardrail check` has something real to catch. It also declares `moment` as a
forbidden dependency (it's listed in package.json) to demonstrate the
forbidden-dependency checker.
