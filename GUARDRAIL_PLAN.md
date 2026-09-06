# Guardrail — Agent Build Plan

> **How to use this file:** Paste this whole document (or point Claude Code / your agent at this file) as the spec. Work through phases in order. Do not skip ahead to a later phase until the current phase's "Definition of Done" checklist passes. After each phase, commit with a message like `feat: complete phase 1 - cli skeleton`.

---

## 0. Project Brief (read this first, always keep in context)

You are building **Guardrail**: an open-source CLI tool that lets a developer define their project's architecture, naming conventions, and security rules once (a "constitution"), then:
1. auto-generates AI agent instruction files (`CLAUDE.md`, `AGENTS.md`, `.cursor/rules`, `.github/copilot-instructions.md`) from that single source, and
2. deterministically checks the actual codebase against those rules (import boundaries, forbidden dependencies, naming/file placement, secret scanning) — no LLM calls for this core enforcement.

**Non-negotiable design rules:**
- Every deterministic check must work with **zero API keys, zero network calls, zero LLM dependency**. This is a stated product differentiator — do not silently introduce an LLM call into any command except the explicitly-optional `guardrail check --semantic` path in Phase 5.
- Never hardcode an opinion about "correct" naming/architecture. All rules come from the user's own `.guardrail/constitution.md`, either hand-written or auto-drafted from their repo and confirmed by them.
- Keep the CLI's core commands (`init`, `check`, `sync`, `scan`) fast (sub-2-second on a mid-size repo) and dependency-light.

**Stack:** TypeScript, Node.js ≥ 20, pnpm workspaces, Commander.js (CLI), `ts-morph` (AST), `simple-git`, `zod` (schema validation), `yaml`, `vitest` (tests).

---

## Phase 1 — Monorepo Skeleton + CLI That Runs

**Goal:** `guardrail --help` works, prints the four planned commands, and each command exists as a stub that doesn't error.

### Tasks
1. Initialize a pnpm workspace monorepo with this structure:
   ```
   guardrail/
   ├── apps/cli/
   ├── packages/core/
   ├── packages/parser/
   ├── packages/rules-engine/
   ├── packages/scanner/
   ├── packages/adapters/
   ├── packages/detectors/
   ├── examples/
   ├── package.json (root, workspaces config)
   ├── pnpm-workspace.yaml
   ├── tsconfig.base.json
   └── README.md
   ```
2. In `apps/cli`, set up a Commander.js entrypoint (`bin/guardrail.ts`) with four stub subcommands: `init`, `check`, `sync`, `scan`. Each stub should just print `"<command> not yet implemented"` and exit 0.
3. Add a root `package.json` script `"build"` that compiles all packages, and confirm `pnpm install && pnpm build && node apps/cli/dist/bin/guardrail.js --help` works.
4. Set up `vitest` at the root with a single passing smoke test.
5. Add `.github/workflows/ci.yml` running install → build → test on push/PR.

### Definition of Done
- [ ] `pnpm install` succeeds from clean clone
- [ ] `guardrail --help` lists `init`, `check`, `sync`, `scan`
- [ ] CI workflow passes on a pushed branch
- [ ] `packages/core` exists with a `Constitution` TypeScript type (even if unused yet)

---

## Phase 2 — Constitution Schema + Parser

**Goal:** Guardrail can read a `.guardrail/constitution.md` file (Markdown + optional YAML frontmatter/blocks) into a validated, typed object.

### Tasks
1. In `packages/core`, define the constitution schema with `zod`:
   - `version: number`
   - `project: { name: string }`
   - `rules: Rule[]`, where a `Rule` has `id`, `description`, `severity` (`"error" | "warning" | "critical"`), `scope` (glob array), and `enforcement` (a discriminated union — see below).
   - Enforcement types to support (add more later, but define the union now): `import-boundary` (`{ deny: string[] }`), `secret-scan` (`{}`), `forbidden-dependency` (`{ deny: string[] }`), `naming` (`{ pattern: string }`), `file-placement` (`{ allowedPaths: string[] }`), `semantic` (`{ prompt: string }`).
2. In `packages/parser`, write a function `parseConstitution(filePath: string): Constitution` that:
   - Reads the Markdown file
   - Extracts embedded YAML rule blocks (fenced ```yaml blocks, or a YAML frontmatter section — pick one convention and document it)
   - Validates the extracted YAML against the zod schema
   - Throws a clear, human-readable error (with line context) on invalid input — this is a place developers will hit errors, make the message actionable
3. Write unit tests covering: valid file parses correctly; missing required field fails with a clear message; unknown enforcement type fails; a constitution with zero structured rules (pure prose) still parses (rules array is just empty).

### Definition of Done
- [ ] `parseConstitution()` has passing unit tests for at least 5 cases (valid, missing field, bad enum, malformed YAML, prose-only file)
- [ ] Schema and parser are exported from `packages/core` and `packages/parser` respectively with clean public APIs
- [ ] A sample constitution file exists in `examples/` and parses without error

---

## Phase 3 — Deterministic Rules Engine (the core value)

**Goal:** Given a parsed constitution and a repo path, `guardrail check` reports real PASS/WARN/BLOCK results for at least import-boundary and secret-scan rules, with zero LLM calls.

### Tasks, in this exact order (highest signal first)
1. **Import boundary checker** (`packages/rules-engine/src/checks/import-boundary.ts`):
   - Use `ts-morph` to load the project's `tsconfig.json` and build a `Project`.
   - For each rule of type `import-boundary`, get all files matching `rule.scope` (glob).
   - For each matched file, get its import declarations, resolve their paths, and check whether any resolved path matches `enforcement.deny` globs.
   - Emit a `Violation` object: `{ ruleId, severity, file, line, message }` for each match.
2. **Secret scanner** (`packages/rules-engine/src/checks/secret-scan.ts`):
   - Implement or wrap a small set of regex patterns for common secret formats (AWS keys, generic API key patterns, private key blocks) plus a basic Shannon-entropy check on string literals over a length threshold.
   - Scan all files in the repo (respecting `.gitignore`) for matches, emit violations.
3. **Forbidden dependency checker**: read `package.json` dependencies + devDependencies, compare against `enforcement.deny` list, emit violations.
4. **Naming checker**: for files matching `scope`, test filename (without extension) against `enforcement.pattern` (a regex string stored in the rule), emit violations for non-matches.
5. **File placement checker**: for files matching `scope`, confirm their path also matches at least one glob in `enforcement.allowedPaths`.
6. Wire all of the above into a single `runChecks(constitution, repoPath): Violation[]` function in `packages/rules-engine`, dispatching by `enforcement.type`.
7. In `apps/cli`, implement the real `guardrail check` command: parse the constitution, run `runChecks`, print a formatted report (grouped by severity), and exit with a non-zero code if any `error`/`critical` violations exist.
8. Add a `--diff` flag to `check` that limits scanned files to those changed vs. the git base branch (use `simple-git` to get the diff file list) — implement this once the full-repo version works, don't build both simultaneously.

### Definition of Done
- [ ] Each checker has unit tests against fixture files with at least one deliberate violation and one clean case
- [ ] `examples/nextjs` (create this fixture repo now if it doesn't exist) has a constitution with at least 2 rule types and `guardrail check` correctly reports a real violation you planted on purpose
- [ ] `guardrail check` exits non-zero on `error`/`critical` violations and zero otherwise
- [ ] `guardrail check --diff` correctly limits scope to changed files only
- [ ] No network calls occur anywhere in this phase's code path (grep for `fetch`/`http` to confirm)

---

## Phase 4 — Repo Discovery (`guardrail init` / `guardrail scan`)

**Goal:** Running `guardrail init` on a real repo produces a sensible draft constitution without the developer writing rules from scratch.

### Tasks
1. In `packages/scanner`, implement detectors (in `packages/detectors/*`) that each return a partial finding:
   - `typescript` detector: presence of `tsconfig.json`, TS version
   - `javascript`/framework detector: read `package.json` deps to identify Next.js/React/Express/etc.
   - `filesystem` detector: infer architecture pattern by checking for common folder names (`src/features/*`, `src/api/*` + `src/services/*` + `src/database/*`, etc.) — implement as a small set of pattern matchers, not a general classifier
   - `naming` detector: for each folder type found (components, hooks, services), sample filenames and infer casing convention by majority vote (>=80% threshold; below that, mark as "mixed/undetected" rather than guessing)
   - `dependencies` detector: list all dependencies, flag any with known-deprecated status if easy to check statically (optional, skip if it requires network access)
2. Combine detector outputs into a draft `Constitution` object using the Phase 2 schema.
3. Implement `guardrail init`:
   - Run all detectors
   - Print a human-readable summary of what was detected
   - Write `.guardrail/constitution.md` (rendering the draft `Constitution` back into the Markdown+YAML format from Phase 2)
   - Print a note telling the user to review/edit the file (interactive accept/edit/reject prompt is a nice-to-have, not required for this phase — a static "review this file, then run `guardrail check`" message is an acceptable V1)
4. Implement `guardrail scan` as `init`'s detection step without the write (dry-run, prints findings only).

### Definition of Done
- [ ] Running `guardrail init` on each `examples/*` fixture repo produces a constitution file that parses successfully (round-trips through Phase 2's parser)
- [ ] Detected naming conventions match what's actually in the fixture repos (manually verify)
- [ ] `guardrail scan` produces output but does not write any files
- [ ] Running `init` twice does not silently overwrite an existing constitution without a warning/confirmation

---

## Phase 5 — Agent File Sync + GitHub Action

**Goal:** `guardrail sync` produces working, genuinely useful `CLAUDE.md`/`AGENTS.md`/Cursor/Copilot files, and `guardrail check --ci` works as a GitHub Action.

### Tasks
1. In `packages/adapters/claude`, implement a template renderer that turns a `Constitution` into a `CLAUDE.md`: project name, architecture summary (human rules section verbatim), and a structured list of enforced rules with IDs and descriptions so the agent knows what will be checked.
2. Repeat for `packages/adapters/agents` (`AGENTS.md`), `packages/adapters/cursor` (`.cursor/rules/*`), `packages/adapters/copilot` (`.github/copilot-instructions.md`). Share a common template-rendering core where the output format allows it — don't duplicate logic four times.
3. Implement `guardrail sync` in the CLI: parse constitution, run all adapters, write their outputs, print a summary of files written.
4. Add golden-file tests: for each `examples/*` fixture, snapshot the expected generated `CLAUDE.md` etc., and fail the test if output drifts unexpectedly.
5. Build `packages/integrations/github`: a minimal GitHub Action (`action.yml` + a small script) that runs `guardrail check --ci`, formats output as a PR-comment-friendly summary (markdown table of violations), and sets the correct exit code for the Action to show pass/fail.
6. (Optional, only after everything above is solid) Add the `--semantic` flag to `check`: for rules of type `semantic`, call the Anthropic API with the diff + rule description, parse a `PASS/FAIL/UNCERTAIN` response, and report it separately from deterministic violations, never contributing to the exit code on `UNCERTAIN`. This must be opt-in (flag or explicit constitution setting) and must clearly document that it requires an API key set via environment variable — never bundle a key or make this the default path.

### Definition of Done
- [ ] `guardrail sync` on each `examples/*` fixture produces all four output files without error
- [ ] Golden-file tests pass and catch a deliberately introduced output regression (verify this by breaking something on purpose once, then fixing it)
- [ ] The GitHub Action, run against a fixture repo in a test workflow, correctly fails on a planted violation and passes on a clean commit
- [ ] `guardrail check` (no `--semantic` flag) still makes zero network calls; `--semantic` is the only code path that does, and it's clearly documented as such in `--help` output

---

## Phase 6 — Drift Detection

**Goal:** `guardrail drift` flags when the codebase's actual stack/patterns no longer match what the constitution declares.

### Tasks
1. Re-run the Phase 4 detectors against the current repo state.
2. Compare fresh detector output against the constitution's declared stack/patterns (e.g. constitution says Postgres+Prisma, detector now finds MongoDB+Mongoose in `package.json`).
3. For each mismatch, use `simple-git` to find the approximate commit/PR that introduced the change (git log on the relevant file, e.g. `package.json`) and surface it in the output.
4. Print a report per mismatch with: what the constitution expects, what's currently detected, and when it changed. Exit code should reflect severity but be less strict than `check` (drift is a warning signal, not necessarily a hard failure) unless the user configures it otherwise.

### Definition of Done
- [ ] Deliberately introduce a mismatch in a fixture repo (swap a declared dependency) and confirm `guardrail drift` catches it with a reasonably accurate "introduced around" signal
- [ ] `drift` does not modify the constitution or the repo — read-only by design

---

## Phase 7 — Polish, Docs, Examples, Release

**Goal:** Ready for public GitHub launch.

### Tasks
1. Ensure `examples/` has 4 complete, realistic fixture repos (Next.js, Express, NestJS, a small monorepo), each with a working constitution and at least one intentionally-planted violation documented in that example's own README for demo purposes.
2. Write the top-level `README.md`: one-paragraph pitch, install instructions, a terminal-output GIF or copy-pasted example of `guardrail check` catching a violation, command reference, license.
3. Add `CONTRIBUTING.md`, `LICENSE` (MIT or Apache-2.0 — pick one and apply consistently across all packages), and GitHub issue templates.
4. Set up `changesets` for versioning, and a release workflow that publishes `apps/cli` to npm as `guardrail` on tagged releases.
5. Full pass of `guardrail --help` and each subcommand's `--help` text for clarity — this is the primary onboarding surface for a CLI tool.

### Definition of Done
- [ ] Fresh clone → `pnpm install && pnpm build` → global link → `guardrail init` on a brand-new sample project works end to end with no manual fixes
- [ ] `npm install -g guardrail` (from a test-published or local tarball) works on a clean machine/container
- [ ] All four example repos pass their own `guardrail check` in CI
- [ ] README demo is accurate to actual current CLI output (re-verify right before publishing — this is the thing that goes stale fastest)

---

## Working Agreement for the Agent

- After finishing each phase, run the full test suite and report pass/fail explicitly before moving to the next phase.
- If a task in a phase turns out to require an LLM call outside of the explicitly-marked Phase 5 `--semantic` path, stop and flag it rather than silently adding a dependency — this breaks a core product guarantee.
- Prefer small, reviewable commits per task within a phase over one giant commit per phase.
- When in doubt about a design choice not specified here (e.g. exact CLI flag names, exact output formatting), make a reasonable choice, document it in the relevant package's README, and continue — don't block on it.
