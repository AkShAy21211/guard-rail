import type { Command } from "commander";

export function registerScanCommand(program: Command): void {
  program
    .command("scan")
    .description("Dry-run repo discovery: print detected stack/patterns without writing files")
    .action(() => {
      console.log("scan not yet implemented");
      process.exitCode = 0;
    });
}
