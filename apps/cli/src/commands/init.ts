import type { Command } from "commander";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description(
      "Scan this repository and draft a .guardrail/constitution.md from what's detected"
    )
    .action(() => {
      console.log("init not yet implemented");
      process.exitCode = 0;
    });
}
