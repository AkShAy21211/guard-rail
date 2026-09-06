import type { Constitution } from "@guardrail/core";
import { GENERATED_NOTICE } from "./shared.js";

export interface CursorRuleFile {
  /** Filename relative to `.cursor/rules/`. */
  filename: string;
  content: string;
}

/**
 * Renders `.cursor/rules/*.mdc` files: one always-applied project overview
 * (from the constitution's prose body) plus one file per structured rule,
 * scoped via Cursor's `globs` frontmatter field so it only surfaces when
 * relevant files are open.
 */
export function renderCursorRules(constitution: Constitution, prose: string): CursorRuleFile[] {
  const files: CursorRuleFile[] = [
    {
      filename: "000-project-overview.mdc",
      content:
        [
          "---",
          `description: Project overview and architecture for ${constitution.project.name}`,
          "globs:",
          "alwaysApply: true",
          "---",
          "",
          GENERATED_NOTICE,
          "",
          `# ${constitution.project.name}`,
          "",
          prose.trim() || "_No additional architecture notes were provided._",
          "",
          "Run `guardrail check` to verify a change against this project's rules before committing.",
          "",
        ].join("\n") + "\n",
    },
  ];

  for (const rule of constitution.rules) {
    files.push({
      filename: `${rule.id}.mdc`,
      content:
        [
          "---",
          `description: ${rule.description}`,
          `globs: ${rule.scope.join(",")}`,
          "alwaysApply: false",
          "---",
          "",
          GENERATED_NOTICE,
          "",
          `**Severity:** ${rule.severity}`,
          `**Enforcement:** \`${rule.enforcement.type}\` (checked by \`guardrail check\`)`,
          "",
          rule.description,
          "",
        ].join("\n") + "\n",
    });
  }

  return files;
}
