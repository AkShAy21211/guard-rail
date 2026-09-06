---
version: 1
project:
  name: acme-app
rules:
  - id: no-cross-feature-imports
    description: Features may not import from each other directly.
    severity: error
    scope: ["src/features/**"]
    enforcement:
      type: import-boundary
      deny: ["src/features/*/*"]
  - id: no-secrets
    description: No hardcoded secrets anywhere in the repo.
    severity: critical
    scope: ["**"]
    enforcement:
      type: secret-scan
---

# Acme App

Free-form architecture notes go here.
