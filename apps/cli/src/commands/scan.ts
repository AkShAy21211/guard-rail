import { resolve } from "node:path";
import type { Command } from "commander";
import { runAllDetectors, formatFindingsSummary } from "@guardrail/scanner";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Dry-run repo discovery: print detected stack/patterns without writing files")
    .option("-p, --path <path>", "path to the repo to scan", ".")
    .action((opts: { path: string }) => {
      const repoPath = resolve(process.cwd(), opts.path);
      const findings = runAllDetectors(repoPath);
      console.log(formatFindingsSummary(findings));
      console.log("\n(dry run — no files were written; run `guardrail init` to write a constitution)");
    });
}
