# Changesets

This directory is managed by [changesets](https://github.com/changesets/changesets)
— the tool that drives Guardrail's versioning and npm release for the
`guardrail` package (the only package this repo publishes; every
`@guardrail/*` package under `packages/` is internal and marked private).

When your PR changes user-facing behavior, run:

```bash
pnpm changeset
```

and follow the prompts (only `guardrail` should ever need a bump — internal
`@guardrail/*` packages are excluded via `.changeset/config.json`'s `ignore`
list). Commit the generated `.changeset/*.md` file alongside your change.

See CONTRIBUTING.md and `.github/workflows/release.yml` for how this turns
into an actual npm release.
