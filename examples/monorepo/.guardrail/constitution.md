---
version: 1
project:
  name: guardrail-example-monorepo
rules:
  - id: no-reaching-into-internal
    description: Other packages must import shared-utils' public entrypoint (packages/shared-utils/src/index.ts), never its internal/ implementation files directly.
    severity: error
    scope: ["packages/app/**/*.ts"]
    enforcement:
      type: import-boundary
      deny: ["packages/shared-utils/src/internal/*"]
  - id: no-secrets
    description: No hardcoded credentials or API keys anywhere in the repo.
    severity: critical
    scope: ["**/*.ts"]
    enforcement:
      type: secret-scan
declaredStack:
  frameworks: []
  architecturePattern: unknown
  dependencies: []
---

# Guardrail Example — small pnpm monorepo

Two packages: `packages/app` (a consumer) and `packages/shared-utils`
(a small library with a public `src/index.ts` and a private
`src/internal/` implementation folder that isn't meant to be imported
directly).

One violation is planted on purpose: `packages/app/src/index.ts` imports
`packages/shared-utils/src/internal/helpers.ts` directly instead of going
through `packages/shared-utils`'s public entrypoint. This trips
`no-reaching-into-internal` (severity: error).

Run from the repo root:

```bash
node apps/cli/dist/bin/guardrail.js check --path examples/monorepo
```
