import { appendFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Command } from "commander";
import { parseConstitution, ConstitutionParseError } from "@guardrail/parser";
import { runChecks, getChangedFiles, getDiffText } from "@guardrail/rules-engine";
import type { Violation, Severity, Rule } from "@guardrail/core";
import { evaluateSemanticRule } from "../semantic.js";

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

/** Markdown-table summary for `--ci`: written to $GITHUB_STEP_SUMMARY when present, and printed to stdout either way. */
function formatMarkdownSummary(violations: Violation[]): string {
  if (violations.length === 0) {
    return "### Guardrail check results\n\n✅ **No violations found.**";
  }

  const sorted = [...violations].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
  const escape = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const rows = sorted.map((v) => {
    const location = v.line !== null ? `${v.file}:${v.line}` : v.file;
    return `| ${SEVERITY_LABEL[v.severity]} | \`${v.ruleId}\` | \`${escape(location)}\` | ${escape(v.message)} |`;
  });
  const counts = (["critical", "error", "warning"] as Severity[])
    .map((s) => `${sorted.filter((v) => v.severity === s).length} ${s}`)
    .join(", ");

  return [
    "### Guardrail check results",
    "",
    `${violations.length} violation(s): ${counts}`,
    "",
    "| Severity | Rule | Location | Message |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");
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
    .option(
      "--ci",
      "also emit a markdown-table summary (written to $GITHUB_STEP_SUMMARY when set, for use in CI/PR comments)",
      false
    )
    .option(
      "--semantic",
      "ALSO evaluate `semantic` rules via the Anthropic API. This is the ONLY " +
        "code path in Guardrail that makes a network call — it never runs unless " +
        "you pass this flag AND set ANTHROPIC_API_KEY, requires --diff, and its " +
        "results are advisory only (they never affect this command's exit code).",
      false
    )
    .action(
      async (opts: {
        path: string;
        constitution: string;
        diff?: string | boolean;
        ci: boolean;
        semantic: boolean;
      }) => {
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
        const baseBranch = typeof opts.diff === "string" ? opts.diff : "main";
        if (opts.diff) {
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

        if (opts.ci) {
          const summary = formatMarkdownSummary(violations);
          console.log("\n" + summary);
          const summaryPath = process.env.GITHUB_STEP_SUMMARY;
          if (summaryPath) {
            appendFileSync(summaryPath, summary + "\n");
          }
        }

        if (opts.semantic) {
          await runSemanticChecks(constitution.rules, opts.diff, changedFiles, repoPath, baseBranch);
        }

        const hasBlockingViolation = violations.some(
          (v) => v.severity === "error" || v.severity === "critical"
        );
        process.exitCode = hasBlockingViolation ? 1 : 0;
      }
    );
}

async function runSemanticChecks(
  rules: Rule[],
  diffOpt: string | boolean | undefined,
  changedFiles: Set<string> | undefined,
  repoPath: string,
  baseBranch: string
): Promise<void> {
  const semanticRules = rules.filter(
    (r): r is Rule & { enforcement: { type: "semantic"; prompt: string } } =>
      r.enforcement.type === "semantic"
  );

  console.log("");
  if (semanticRules.length === 0) {
    console.log("--semantic: constitution has no `semantic` rules; nothing to evaluate.");
    return;
  }
  if (!diffOpt || !changedFiles) {
    console.error(
      "--semantic requires --diff <baseBranch> (it evaluates rules against your changes, not the whole repo)."
    );
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "--semantic requires the ANTHROPIC_API_KEY environment variable to be set. Skipping semantic checks."
    );
    return;
  }

  console.log(
    `Running ${semanticRules.length} semantic check(s) via the Anthropic API ` +
      "(this is the only network call Guardrail ever makes, and only because --semantic was passed)..."
  );
  const diffText = await getDiffText(repoPath, baseBranch);
  for (const rule of semanticRules) {
    try {
      const result = await evaluateSemanticRule(rule, diffText, apiKey);
      console.log(`  [${result.ruleId}] ${result.verdict} — ${result.rationale}`);
    } catch (err) {
      console.error(`  [${rule.id}] ERROR — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log("(semantic results are advisory only — they never affect guardrail check's exit code)");
}
