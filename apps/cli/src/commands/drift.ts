import type { Command } from "commander";

export function registerDriftCommand(program: Command): void {
  program
    .command("drift")
    .description(
      "Flag when the codebase's actual stack/patterns no longer match the constitution (read-only)"
    )
    .action(() => {
      console.log("drift not yet implemented");
      process.exitCode = 0;
    });
}
