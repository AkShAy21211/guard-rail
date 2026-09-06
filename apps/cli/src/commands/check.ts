import type { Command } from "commander";

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description(
      "Deterministically check the repo against .guardrail/constitution.md (no LLM calls)"
    )
    .action(() => {
      console.log("check not yet implemented");
      process.exitCode = 0;
    });
}
