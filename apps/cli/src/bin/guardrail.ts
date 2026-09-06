#!/usr/bin/env node
import { Command } from "commander";
import { registerInitCommand } from "../commands/init.js";
import { registerCheckCommand } from "../commands/check.js";
import { registerSyncCommand } from "../commands/sync.js";
import { registerScanCommand } from "../commands/scan.js";
import { registerDriftCommand } from "../commands/drift.js";

const program = new Command();

program
  .name("guardrail")
  .description(
    "Define your project's architecture, naming conventions, and security rules once, " +
      "then generate AI agent instructions and enforce them deterministically. " +
      "No API keys or network calls required for core checks."
  )
  .version("0.0.0");

registerInitCommand(program);
registerCheckCommand(program);
registerSyncCommand(program);
registerScanCommand(program);
registerDriftCommand(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
