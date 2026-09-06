---
version: 1
project:
  name: guardrail-example-nestjs
rules:
  - id: controller-naming
    description: Controller files use PascalCase and end in "Controller" (e.g. UserController.ts).
    severity: error
    scope: ["src/controllers/**/*.ts"]
    enforcement:
      type: naming
      pattern: "^[A-Z][A-Za-z0-9]*Controller$"
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
  frameworks: []
  architecturePattern: mvc
  dependencies:
    - "@nestjs/core"
    - "@nestjs/common"
    - request
---

# Guardrail Example — NestJS

A small NestJS-shaped fixture (`src/controllers`, `src/services`,
`src/models` — an MVC-flavored layout). Two violations are planted on
purpose:

1. `src/controllers/user-controller.ts` is named in kebab-case, not
   `UserController.ts` — this trips `controller-naming` (severity: error).
2. `package.json` depends on the deprecated `request` package — this trips
   `no-request-package` (severity: warning).

Run from the repo root:

```bash
node apps/cli/dist/bin/guardrail.js check --path examples/nestjs
```
