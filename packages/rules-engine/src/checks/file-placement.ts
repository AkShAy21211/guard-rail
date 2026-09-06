import fg from "fast-glob";
import type { Rule, Violation } from "@guardrail/core";
import { matchesAnyGlob } from "../util.js";

/** Checks that files matching `rule.scope` also fall under at least one of `enforcement.allowedPaths`. */
export function checkFilePlacement(rule: Rule, repoPath: string): Violation[] {
  if (rule.enforcement.type !== "file-placement") return [];

  const files = fg.sync(rule.scope, {
    cwd: repoPath,
    dot: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  const violations: Violation[] = [];
  for (const relPath of files) {
    if (!matchesAnyGlob(relPath, rule.enforcement.allowedPaths)) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        file: relPath,
        line: null,
        message: `${rule.description} (not under any allowed path: ${rule.enforcement.allowedPaths.join(", ")})`,
      });
    }
  }
  return violations;
}
