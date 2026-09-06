---
version: 1
project:
  name: sample-app
rules:
  - id: no-cross-feature-imports
    description: Features must not import from each other directly; share code through packages/shared instead.
    severity: error
    scope: ["src/features/**"]
    enforcement:
      type: import-boundary
      deny: ["src/features/*/*"]
  - id: no-secrets
    description: No hardcoded credentials or API keys anywhere in the repo.
    severity: critical
    scope: ["**"]
    enforcement:
      type: secret-scan
  - id: no-moment
    description: Use date-fns instead of the deprecated moment.js.
    severity: warning
    scope: ["package.json"]
    enforcement:
      type: forbidden-dependency
      deny: ["moment"]
  - id: component-naming
    description: React components use PascalCase filenames.
    severity: warning
    scope: ["src/components/**/*.tsx"]
    enforcement:
      type: naming
      pattern: "^[A-Z][A-Za-z0-9]*$"
  - id: services-live-in-services
    description: Service modules must live under src/services.
    severity: error
    scope: ["**/*Service.ts"]
    enforcement:
      type: file-placement
      allowedPaths: ["src/services/**"]
---

# Sample App

This is a minimal example constitution used in Guardrail's own test suite
and documentation. It demonstrates every enforcement type supported in
Phase 2/3: import boundaries, secret scanning, forbidden dependencies,
naming conventions, and file placement.
