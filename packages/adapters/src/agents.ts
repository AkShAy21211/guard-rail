import type { Constitution } from "@guardrail/core";
import { renderAgentMarkdown } from "./shared.js";

/** Renders AGENTS.md (the emerging cross-tool agent-instructions convention). Shares its template with CLAUDE.md. */
export function renderAgentsMd(constitution: Constitution, prose: string): string {
  return renderAgentMarkdown(constitution, prose);
}
