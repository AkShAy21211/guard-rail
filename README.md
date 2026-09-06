# Guardrail

Guardrail lets you define your project's architecture, naming conventions, and
security rules once — in a single `.guardrail/constitution.md` — and then:

1. **generates** AI agent instruction files (`CLAUDE.md`, `AGENTS.md`,
   `.cursor/rules`, `.github/copilot-instructions.md`) from that one source, and
2. **deterministically enforces** those rules against your actual codebase
   (import boundaries, forbidden dependencies, naming/file placement, secret
   scanning) — with zero API keys, zero network calls, and zero LLM dependency
   for the core checks.

> This project is under active development. See `guardrailagentbuildplan.md`
> in the repo history / project docs for the phased build plan this repo
> follows.

## Status

This repo is being built phase by phase against a fixed spec. Current state:
CLI skeleton with stub commands (`init`, `check`, `sync`, `scan`, `drift`).

## Development

```bash
pnpm install
pnpm build
node apps/cli/dist/bin/guardrail.js --help
```

## Commands

- `guardrail init` — scan the repo and draft `.guardrail/constitution.md`
- `guardrail check` — enforce the constitution deterministically (zero network calls, zero LLM calls)
  - `--diff [baseBranch]` — only check files changed vs. a base branch (default `main`)
  - `--ci` — also emit a markdown-table summary (written to `$GITHUB_STEP_SUMMARY` when set)
  - `--semantic` — **opt-in only.** Evaluates `semantic`-type rules via the Anthropic API. This
    is the *only* code path in Guardrail that makes a network call. It requires `--diff` and the
    `ANTHROPIC_API_KEY` environment variable, and its results are advisory — they never affect
    `check`'s exit code.
- `guardrail sync` — regenerate `CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`, and
  `.cursor/rules/*.mdc` from the constitution
- `guardrail scan` — dry-run of `init`'s detection step (prints findings, writes nothing)
- `guardrail drift` — flag when the codebase no longer matches the constitution (Phase 6)

## GitHub Action

`packages/integrations/github` is a composite action that runs `guardrail check --ci` in CI. See
its own [README](packages/integrations/github/README.md) for usage.

## License

MIT
