import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Rule, Violation } from "@guardrail/core";
import { matchesAnyGlob } from "../util.js";

/** Checks package.json dependencies + devDependencies against `enforcement.deny`. */
export function checkForbiddenDependency(rule: Rule, repoPath: string): Violation[] {
  if (rule.enforcement.type !== "forbidden-dependency") return [];

  const pkgPath = resolve(repoPath, "package.json");
  if (!existsSync(pkgPath)) return [];

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return [];
  }

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const violations: Violation[] = [];

  for (const depName of Object.keys(deps)) {
    if (matchesAnyGlob(depName, rule.enforcement.deny)) {
      violations.push({
        ruleId: rule.id,
        severity: rule.severity,
        file: "package.json",
        line: null,
        message: `${rule.description} (forbidden dependency: "${depName}")`,
      });
    }
  }

  return violations;
}
