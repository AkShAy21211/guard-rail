---
version: 1
project:
  name: acme-app
rules:
  - id: mystery-rule
    description: This rule uses an enforcement type that does not exist.
    severity: error
    scope: ["src/**"]
    enforcement:
      type: telekinesis
      deny: ["everything"]
---
