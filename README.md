# Guardrail

**Write your project's architecture, naming conventions, and security rules
down once — as a `.guardrail/constitution.md` — and Guardrail does two
things with it: it generates the instruction files your AI coding agents
already read (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`,
`.github/copilot-instructions.md`), and it deterministically checks your
actual codebase against those same rules — import boundaries, forbidden
dependencies, naming conventions, file placement, and secret scanning —
with zero API keys, zero network calls, and zero LLM dependency for every
one of those checks.** Agents get told the rules once instead of
re-explaining them every session; your CI enforces the rules the same way
every time, without ever calling out to a model.

## Install

```bash
npm install -g guardrail
```

Or, from a clone of this repo:

```bash
pnpm install
pnpm build
node apps/cli/dist/bin/guardrail.js --help   # or: npm link, then `guardrail --help`
```

## See it catch a real violation

```
$ guardrail check --path examples/nextjs

ERROR (1)
  [no-cross-feature-imports] src/features/billing/index.ts:4 — Features must not import from each other directly; share code through packages/shared instead. (import "../auth/session" resolves to a denied path)

WARN (1)
  [no-moment] package.json — Use date-fns instead of the deprecated moment.js. (forbidden dependency: "moment")

2 violation(s): 0 critical, 1 error, 1 warning
$ echo $?
1
```

That's `examples/nextjs` — one of four example repos in this repo, each
with a real, intentionally-planted violation documented in its own README
(`examples/nextjs`, `examples/express`, `examples/nestjs`,
`examples/monorepo`). No LLM was involved in producing that output — it's
static analysis (`ts-morph` for import resolution, regex/entropy for
secrets, plain file-tree checks for naming and placement) against rules
you wrote or `guardrail init` drafted from your own codebase.

## How it fits together

1. **`guardrail init`** scans your repo (TypeScript? Which framework?
   What's the folder structure? What naming convention do you already use
   in `components/`, `services/`, etc.?) and drafts
   `.guardrail/constitution.md` — a Markdown file with a YAML frontmatter
   block holding the structured, enforceable rules, and a free-form prose
   body for architecture notes a human (or an agent) should read. Nothing
   here is Guardrail's opinion about what "correct" looks like — every
   drafted rule reflects a convention your repo is already following.
2. You **review and edit** that file. Add rules by hand, delete ones that
   don't fit, write the prose section.
3. **`guardrail sync`** turns it into `CLAUDE.md`, `AGENTS.md`,
   `.cursor/rules/*.mdc`, and `.github/copilot-instructions.md` — so every
   agent you use gets the same architecture notes and the same list of
   rules that will actually be checked.
4. **`guardrail check`** (typically wired into CI via
   `packages/integrations/github`, or run locally / in a pre-commit hook)
   enforces the constitution's rules deterministically. `--diff <branch>`
   scopes it to just what changed; `--ci` adds a markdown-table summary for
   your CI system.
5. **`guardrail drift`** is read-only and separate from `check`: it
   re-detects your stack and flags when it no longer matches what
   `init` captured (e.g. Postgres+Prisma quietly became MongoDB+Mongoose
   somewhere along the way), with an approximate "here's the commit that
   did it" pointer. It's a signal, not a hard failure, unless you pass
   `--strict`.

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
- `guardrail drift` — flag when the codebase's actual stack no longer matches what
  `guardrail init` last captured (read-only; a warning signal by default, use `--strict`
  to fail CI on drift)

Run `guardrail <command> --help` for the full set of flags on any command.

## Constitution format

```markdown
---
version: 1
project:
  name: my-app
rules:
  - id: no-cross-feature-imports
    description: Features may not import from each other directly.
    severity: error
    scope: ["src/features/**"]
    enforcement:
      type: import-boundary
      deny: ["src/features/*/*"]
---

# My App

Free-form prose: architecture rationale, conventions, anything a human or
an agent should know. Carried verbatim into CLAUDE.md/AGENTS.md/etc.
```

All structured, enforceable data lives in the YAML frontmatter; the
Markdown body below it is untouched prose. A constitution with no
frontmatter at all is valid too — it's treated as pure prose with zero
rules to enforce. Enforcement types: `import-boundary`, `secret-scan`,
`forbidden-dependency`, `naming`, `file-placement`, and the opt-in
`semantic` (used only by `check --semantic`).

## GitHub Action

`packages/integrations/github` is a composite action that runs `guardrail check --ci` in CI. See
its own [README](packages/integrations/github/README.md) for usage.

## Repository layout

```
guardrail/
├── apps/cli/                  the `guardrail` CLI
├── packages/core/             Constitution schema (zod) + shared types
├── packages/parser/           parseConstitution / renderConstitution
├── packages/rules-engine/     the deterministic checkers + runChecks()
├── packages/detectors/        the zero-network repo-discovery detectors
├── packages/scanner/          combines detectors into a draft Constitution; drift comparison
├── packages/adapters/         CLAUDE.md / AGENTS.md / Cursor / Copilot renderers
├── packages/integrations/github/  the GitHub Action
└── examples/                  four example repos, each with a planted violation
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more.

## License

MIT — see [LICENSE](LICENSE).
