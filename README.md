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

## Commands (planned)

- `guardrail init` — scan the repo and draft a constitution
- `guardrail check` — enforce the constitution deterministically (no network)
- `guardrail sync` — regenerate agent instruction files from the constitution
- `guardrail scan` — dry-run of `init`'s detection step
- `guardrail drift` — flag when the codebase no longer matches the constitution

## License

MIT
