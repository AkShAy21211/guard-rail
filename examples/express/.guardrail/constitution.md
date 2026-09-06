---
version: 1
project:
  name: guardrail-example-express
rules:
  - id: api-must-go-through-services
    description: The API layer must not import the database layer directly — go through src/services instead.
    severity: error
    scope: ["src/api/**/*.ts"]
    enforcement:
      type: import-boundary
      deny: ["src/database/*"]
  - id: no-secrets
    description: No hardcoded credentials or API keys anywhere in the repo.
    severity: critical
    scope: ["**/*.ts"]
    enforcement:
      type: secret-scan
  - id: no-request-package
    description: The `request` package is deprecated; use the built-in fetch or `undici` instead.
    severity: warning
    scope: ["package.json"]
    enforcement:
      type: forbidden-dependency
      deny: ["request"]
declaredStack:
  frameworks:
    - Express
  architecturePattern: layered
  dependencies:
    - express
    - request
---

# Guardrail Example — Express (layered architecture)

This fixture demonstrates a classic layered backend: `src/api` (route
handlers) → `src/services` (business logic) → `src/database` (data
access). The rule `api-must-go-through-services` enforces that layering.

Two violations are planted on purpose:

1. `src/api/users.ts` imports `src/database/connection.ts` directly,
   skipping `src/services/UserService.ts` — this trips
   `api-must-go-through-services` (severity: error).
2. `package.json` depends on the deprecated `request` package — this trips
   `no-request-package` (severity: warning).

Run from the repo root:

```bash
node apps/cli/dist/bin/guardrail.js check --path examples/express
```
