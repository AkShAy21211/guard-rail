import type { Command } from "commander";

export function registerSyncCommand(program: Command): void {
  program
    .command("sync")
    .description(
      "Generate CLAUDE.md, AGENTS.md, .cursor/rules, and .github/copilot-instructions.md from the constitution"
    )
    .action(() => {
      console.log("sync not yet implemented");
      process.exitCode = 0;
    });
}
