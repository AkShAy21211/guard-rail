import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Command } from "commander";
import { parseConstitution, extractProse, ConstitutionParseError } from "@guardrail/parser";
import { buildSyncOutputs } from "@guardrail/adapters";

export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description(
      "Generate CLAUDE.md, AGENTS.md, .cursor/rules, and .github/copilot-instructions.md from the constitution"
    )
    .option("-p, --path <path>", "path to the repo", ".")
    .option(
      "-c, --constitution <path>",
      "path to the constitution file",
      ".guardrail/constitution.md"
    )
    .action((opts: { path: string; constitution: string }) => {
      const repoPath = resolve(process.cwd(), opts.path);
      const constitutionPath = resolve(repoPath, opts.constitution);

      let constitution;
      let prose: string;
      try {
        constitution = parseConstitution(constitutionPath);
        prose = extractProse(constitutionPath);
      } catch (err) {
        if (err instanceof ConstitutionParseError) {
          console.error(err.message);
          process.exitCode = 1;
          return;
        }
        throw err;
      }

      const outputs = buildSyncOutputs(constitution, prose);
      for (const output of outputs) {
        const fullPath = resolve(repoPath, output.relativePath);
        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, output.content, "utf-8");
      }

      console.log(`Wrote ${outputs.length} file(s):`);
      for (const output of outputs) {
        console.log(`  - ${output.relativePath}`);
      }
    });
}
