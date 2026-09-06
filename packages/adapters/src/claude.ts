import type { Constitution } from "@guardrail/core";
import { renderAgentMarkdown } from "./shared.js";

/** Renders CLAUDE.md. Shares its template with AGENTS.md and the Copilot adapter. */
export function renderClaudeMd(constitution: Constitution, prose: string): string {
  return renderAgentMarkdown(constitution, prose);
}
