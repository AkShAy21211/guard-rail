import type { Constitution, Violation } from "@guardrail/core";
import { checkImportBoundary } from "./checks/import-boundary.js";
import { checkSecretScan } from "./checks/secret-scan.js";
import { checkForbiddenDependency } from "./checks/forbidden-dependency.js";
import { checkNaming } from "./checks/naming.js";
import { checkFilePlacement } from "./checks/file-placement.js";

export interface RunChecksOptions {
  /**
   * When set, restricts every file-scoped checker to this set of
   * repo-relative paths (used by `guardrail check --diff`). Whole-manifest
   * checks (forbidden-dependency) are skipped unless package.json itself is
   * in the set.
   */
  changedFiles?: Set<string>;
}

function filterByChangedFiles(violations: Violation[], changedFiles?: Set<string>): Violation[] {
  if (!changedFiles) return violations;
  return violations.filter((v) => changedFiles.has(v.file.split("\\").join("/")));
}

/**
 * Runs every deterministic checker over `constitution.rules` against the
 * repo at `repoPath`. Zero network calls, zero LLM calls — every checker
 * here is pure static analysis / filesystem inspection.
 */
export function runChecks(
  constitution: Constitution,
  repoPath: string,
  options: RunChecksOptions = {}
): Violation[] {
  const { changedFiles } = options;
  const violations: Violation[] = [];

  for (const rule of constitution.rules) {
    switch (rule.enforcement.type) {
      case "import-boundary":
        violations.push(...filterByChangedFiles(checkImportBoundary(rule, repoPath), changedFiles));
        break;
      case "secret-scan":
        violations.push(...filterByChangedFiles(checkSecretScan(rule, repoPath), changedFiles));
        break;
      case "forbidden-dependency":
        if (!changedFiles || changedFiles.has("package.json")) {
          violations.push(...checkForbiddenDependency(rule, repoPath));
        }
        break;
      case "naming":
        violations.push(...filterByChangedFiles(checkNaming(rule, repoPath), changedFiles));
        break;
      case "file-placement":
        violations.push(...filterByChangedFiles(checkFilePlacement(rule, repoPath), changedFiles));
        break;
      case "semantic":
        // Explicitly never run here — Phase 5's opt-in `guardrail check --semantic`
        // path is the only place a `semantic` rule is evaluated, and it calls out
        // to an LLM. Silently skipping it here keeps `runChecks` fully network-free.
        break;
      default: {
        const _exhaustive: never = rule.enforcement;
        void _exhaustive;
      }
    }
  }

  return violations;
}
