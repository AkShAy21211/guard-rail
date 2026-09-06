import type { Constitution } from "@guardrail/core";
import { renderClaudeMd } from "./claude.js";
import { renderAgentsMd } from "./agents.js";
import { renderCopilotInstructions } from "./copilot.js";
import { renderCursorRules } from "./cursor.js";

export { renderClaudeMd } from "./claude.js";
export { renderAgentsMd } from "./agents.js";
export { renderCopilotInstructions } from "./copilot.js";
export { renderCursorRules } from "./cursor.js";
export type { CursorRuleFile } from "./cursor.js";
export { renderAgentMarkdown, renderRulesList, GENERATED_NOTICE } from "./shared.js";

export interface SyncOutput {
  /** Path relative to the repo root. */
  relativePath: string;
  content: string;
}

/**
 * Runs every adapter and returns the full set of files `guardrail sync`
 * should write: CLAUDE.md, AGENTS.md, .github/copilot-instructions.md, and
 * one .cursor/rules/*.mdc file per structured rule plus a project overview.
 */
export function buildSyncOutputs(constitution: Constitution, prose: string): SyncOutput[] {
  const outputs: SyncOutput[] = [
    { relativePath: "CLAUDE.md", content: renderClaudeMd(constitution, prose) },
    { relativePath: "AGENTS.md", content: renderAgentsMd(constitution, prose) },
    {
      relativePath: ".github/copilot-instructions.md",
      content: renderCopilotInstructions(constitution, prose),
    },
  ];

  for (const file of renderCursorRules(constitution, prose)) {
    outputs.push({ relativePath: `.cursor/rules/${file.filename}`, content: file.content });
  }

  return outputs;
}
