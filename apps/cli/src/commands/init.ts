import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Command } from "commander";
import { runAllDetectors, buildDraftConstitution, formatFindingsSummary } from "@guardrail/scanner";
import { renderConstitution } from "@guardrail/parser";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description(
      "Scan this repository and draft a .guardrail/constitution.md from what's detected"
    )
    .option("-p, --path <path>", "path to the repo to scan", ".")
    .option(
      "-c, --constitution <path>",
      "where to write the constitution file, relative to --path",
      ".guardrail/constitution.md"
    )
    .option("-f, --force", "overwrite an existing constitution file", false)
    .action((opts: { path: string; constitution: string; force: boolean }) => {
      const repoPath = resolve(process.cwd(), opts.path);
      const constitutionPath = resolve(repoPath, opts.constitution);

      if (existsSync(constitutionPath) && !opts.force) {
        console.error(
          `A constitution already exists at ${opts.constitution}.\n` +
            `Re-run with --force to overwrite it (this discards any manual edits you've made).`
        );
        process.exitCode = 1;
        return;
      }

      const findings = runAllDetectors(repoPath);
      console.log("Detected:");
      console.log(formatFindingsSummary(findings));
      console.log("");

      const draft = buildDraftConstitution(repoPath, findings);
      const rendered = renderConstitution(draft);

      mkdirSync(dirname(constitutionPath), { recursive: true });
      writeFileSync(constitutionPath, rendered, "utf-8");

      console.log(`Wrote ${opts.constitution} (${draft.rules.length} rule(s) drafted).`);
      console.log("Review this file, then run `guardrail check`.");
    });
}
