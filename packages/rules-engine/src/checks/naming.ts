import { basename, extname } from "node:path";
import fg from "fast-glob";
import type { Rule, Violation } from "@guardrail/core";

/** Checks that filenames (without extension) matching `rule.scope` match `enforcement.pattern`. */
export function checkNaming(rule: Rule, repoPath: string): Violation[] {
  if (rule.enforcement.type !== "naming") return [];

  const pattern = new RegExp(rule.enforcement.pattern);
  const files = fg.sync(rule.scope, {
    cwd: repoPath,
    dot: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  const violations: Violation[] = [];
  for (const relPath of files) {
    const name = basename(relPath, extname(relPath));
    if (!pattern.test(name)) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        file: relPath,
        line: null,
        message: `${rule.description} (filename "${name}" does not match /${rule.enforcement.pattern}/)`,
      });
    }
  }
  return violations;
}
