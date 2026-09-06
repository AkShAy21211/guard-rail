# Contributing to Guardrail

Thanks for considering a contribution. This project has one design rule
that overrides everything else below: **every deterministic check
(`guardrail check` without `--semantic`, `guardrail scan`, `guardrail
init`, `guardrail drift`) must work with zero API keys, zero network
calls, and zero LLM dependency.** If a change to any of those commands
would require a network call, it doesn't belong there — the only place
that's allowed is the explicitly-opt-in `guardrail check --semantic` path.
`packages/rules-engine/test/no-network-calls.test.ts` enforces this for
the core packages; please don't work around it.

## Getting set up

```bash
git clone <this repo>
cd guardrail
pnpm install
pnpm build
pnpm test
```

Requires Node.js >= 20 and pnpm (see `packageManager` in the root
`package.json` for the exact version this repo develops against).

## Project layout

- `apps/cli` — the `guardrail` CLI itself (Commander.js). Thin: it wires
  flags to the packages below and formats output.
- `packages/core` — the `Constitution`/`Rule`/`Enforcement` zod schema and
  shared types (`Violation`, etc.). Change the schema here first.
- `packages/parser` — `parseConstitution()` / `renderConstitution()` /
  `extractProse()`. Owns the `.guardrail/constitution.md` file format.
- `packages/rules-engine` — the deterministic checkers
  (`packages/rules-engine/src/checks/*.ts`) and `runChecks()`.
- `packages/detectors` — the zero-network repo-discovery detectors used by
  `guardrail init`/`scan`/`drift`.
- `packages/scanner` — combines detector output into a draft
  `Constitution`, and computes drift.
- `packages/adapters` — renders `CLAUDE.md`/`AGENTS.md`/Cursor
  rules/Copilot instructions from a `Constitution`.
- `packages/integrations/github` — the GitHub Action.
- `examples/*` — fixture repos with a real, documented, planted violation
  each. Used by the test suite and as living documentation.

## Adding a new enforcement type

1. Add the discriminated-union member to `EnforcementSchema` in
   `packages/core/src/schema.ts`.
2. Implement the checker in `packages/rules-engine/src/checks/<name>.ts`
   and wire it into `runChecks()` in `packages/rules-engine/src/runChecks.ts`.
3. Add unit tests with a clean fixture and a violating fixture (see the
   existing checks for the pattern).
4. Consider whether `packages/adapters` needs anything special to describe
   the new type in generated agent files (usually it doesn't — the shared
   template just prints `enforcement.type` and `description`).

## Tests

```bash
pnpm test          # runs the full suite (vitest) across every package
pnpm test -- -u    # update golden-file/snapshot tests after a deliberate output change
```

Golden-file (snapshot) tests live in `packages/adapters/test/` — if you
change a template's output on purpose, review the snapshot diff carefully
before updating it; that diff is exactly what real users' generated
`CLAUDE.md` etc. will change to.

## Commit style

Small, reviewable commits over one giant commit. A commit message that
explains *why*, not just *what*, is worth the extra sentence.

## Design choices worth knowing before you send a PR

- Constitutions never carry an opinion Guardrail invented. `guardrail
  init`'s drafted rules only ever reflect what's *already true* of the
  repo (its own dominant naming convention, its own dependency list) plus
  one universal secret-scanning default — never an architectural
  preference. Keep new detector-driven rule generation consistent with
  that.
- `guardrail drift` is read-only, always. It never rewrites the
  constitution or touches repo files, and it's a warning signal (exit 0)
  unless `--strict` is passed — it doesn't get to unilaterally fail
  someone's build the way `check` does for `error`/`critical` violations.
- Keep the core commands fast (this repo's own goal is sub-2-second on a
  mid-size repo) and dependency-light. Before adding a new dependency to
  `packages/rules-engine` or `packages/detectors`, ask whether the
  functionality is worth the added weight on every `guardrail check` run.

## Reporting bugs / requesting features

Please use the issue templates under `.github/ISSUE_TEMPLATE/`.
