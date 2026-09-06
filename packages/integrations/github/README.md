# Guardrail GitHub Action

A composite action that runs `guardrail check --ci` against your repo and
fails the workflow on any `error`/`critical` violation. Zero API keys, zero
network calls — the same deterministic guarantee as the CLI itself.

## Usage

```yaml
name: Guardrail

on:
  pull_request:

jobs:
  guardrail:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # needed if you use diff-base

      - uses: AkShAy21211/guard-rail/packages/integrations/github@v1
        with:
          diff-base: origin/main
```

If your repo already has `guardrail` as a devDependency (recommended, so CI
uses the exact version you develop against), this action detects it on
`PATH` (via your package manager's bin shim, e.g. after `pnpm install`) and
skips the install step. Otherwise it installs the version named by
`guardrail-version` (default: `latest`) as `guard-rail` via `npm install -g`.

The check's markdown-table summary is written to `$GITHUB_STEP_SUMMARY`
(GitHub renders this on the workflow run's summary page — the standard,
non-deprecated way to surface a PR-comment-friendly summary without needing
extra permissions to post comments directly).

## Inputs

| Name | Default | Description |
|---|---|---|
| `path` | `.` | Path to the repo to check. |
| `constitution` | `.guardrail/constitution.md` | Path to the constitution file, relative to `path`. |
| `diff-base` | _(unset)_ | If set, only checks files changed vs. this ref. |
| `guardrail-version` | `latest` | npm version/tag to install if not already on PATH. |

This action's own correctness is verified in
`.github/workflows/test-action.yml`: it runs against `examples/nextjs`
(which has a planted violation and must fail) and `examples/sample` (which
must pass).
