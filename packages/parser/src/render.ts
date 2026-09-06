import { stringify as stringifyYaml } from "yaml";
import type { Constitution } from "@guardrail/core";

export interface RenderOptions {
  /** Free-form Markdown body placed after the frontmatter. Defaults to a short review note. */
  proseBody?: string;
}

/**
 * Serializes a Constitution back into the `.guardrail/constitution.md`
 * format documented in packages/parser/src/index.ts: a YAML frontmatter
 * block carrying all structured data, followed by a free-form Markdown
 * body. Round-trips with parseConstitution().
 */
export function renderConstitution(constitution: Constitution, options: RenderOptions = {}): string {
  const yamlBody = stringifyYaml(constitution, { indent: 2, lineWidth: 0 });
  const prose =
    options.proseBody ??
    `# ${constitution.project.name}\n\n` +
      "This constitution was drafted by `guardrail init` from what was detected " +
      "in this repository. Review the rules above, edit anything that doesn't " +
      "match your intent, then run `guardrail check`.\n";

  return `---\n${yamlBody}---\n\n${prose}`;
}
