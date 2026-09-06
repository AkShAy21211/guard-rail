# examples/nextjs

A minimal Next.js-shaped fixture repo used by Guardrail's own test suite and
as a demo of `guardrail check` catching a real violation.

Run from the repo root:

```bash
node apps/cli/dist/bin/guardrail.js check --path examples/nextjs
```

Expected output: one `error`-severity violation (`no-cross-feature-imports`,
`src/features/billing/index.ts` importing directly from
`src/features/auth/session.ts`) and one `warning`-severity violation
(`no-moment`, since `package.json` lists `moment` as a dependency).
