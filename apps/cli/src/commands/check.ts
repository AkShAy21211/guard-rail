import { resolve } from "node:path";
import type { Command } from "commander";
import { parseConstitution, ConstitutionParseError } from "@guardrail/parser";
import { runChecks, getChangedFiles } from "@guardrail/rules-engine";
import type { Violation, Severity } from "@guardrail/core";

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, error: 1, warning: 2 };
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "CRITICAL",
  error: "ERROR",
  warning: "WARN",
};

function formatReport(violations: Violation[]): string {
  if (violations.length === 0) {
    return "No violations found. ✓";
  }

  const sorted = [...violations].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return a.file.localeCompare(b.file);
  });

  const grouped = new Map<Severity, Violation[]>();
  for (const v of sorted) {
    const bucket = grouped.get(v.severity) ?? [];
    bucket.push(v);
    grouped.set(v.severity, bucket);
  }

  const lines: string[] = [];
  for (const severity of ["critical", "error", "warning"] as Severity[]) {
    const bucket = grouped.get(severity);
    if (!bucket || bucket.length === 0) continue;
    lines.push(`\n${SEVERITY_LABEL[severity]} (${bucket.length})`);
    for (const v of bucket) {
      const location = v.line !== null ? `${v.file}:${v.line}` : v.file;
      lines.push(`  [${v.ruleId}] ${location} — ${v.message}`);
    }
  }

  const counts = (["critical", "error", "warning"] as Severity[])
    .map((s) => `${grouped.get(s)?.length ?? 0} ${s}`)
    .join(", ");
  lines.push(`\n${violations.length} violation(s): ${counts}`);

  return lines.join("\n");
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description(
      "Deterministically check the repo against .guardrail/constitution.md (no LLM calls)"
    )
    .option("-p, --path <path>", "path to the repo to check", ".")
    .option(
      "-c, --constitution <path>",
      "path to the constitution file",
      ".guardrail/constitution.md"
    )
    .option(
      "--diff [baseBranch]",
      "only check files changed vs. the given base branch (default: main)"
    )
    .action(async (opts: { path: string; constitution: string; diff?: string | boolean }) => {
      const repoPath = resolve(process.cwd(), opts.path);
      const constitutionPath = resolve(repoPath, opts.constitution);

      let constitution;
      try {
        constitution = parseConstitution(constitutionPath);
      } catch (err) {
        if (err instanceof ConstitutionParseError) {
          console.error(err.message);
          process.exitCode = 1;
          return;
        }
        throw err;
      }

      let changedFiles: Set<string> | undefined;
      if (opts.diff) {
        const baseBranch = typeof opts.diff === "string" ? opts.diff : "main";
        try {
          changedFiles = await getChangedFiles(repoPath, baseBranch);
        } catch (err) {
          console.error(
            `Could not compute git diff against "${baseBranch}": ${
              err instanceof Error ? err.message : String(err)
            }`
          );
          process.exitCode = 1;
          return;
        }
      }

      const violations = runChecks(constitution, repoPath, { changedFiles });
      console.log(formatReport(violations));

      const hasBlockingViolation = violations.some(
        (v) => v.severity === "error" || v.severity === "critical"
      );
      process.exitCode = hasBlockingViolation ? 1 : 0;
    });
}
