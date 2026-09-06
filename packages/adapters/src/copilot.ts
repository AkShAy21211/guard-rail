import type { Constitution } from "@guardrail/core";
import { renderAgentMarkdown } from "./shared.js";

/** Renders .github/copilot-instructions.md. Shares its template with CLAUDE.md/AGENTS.md. */
export function renderCopilotInstructions(constitution: Constitution, prose: string): string {
  return renderAgentMarkdown(constitution, prose);
}
