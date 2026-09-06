import { resolve } from "node:path";
import type { Command } from "commander";
import { parseConstitution, ConstitutionParseError } from "@guardrail/parser";
import { runAllDetectors } from "@guardrail/detectors";
import { computeDrift } from "@guardrail/scanner";
import { findIntroducingCommit } from "@guardrail/rules-engine";
import type { DriftFinding } from "@guardrail/scanner";

async function annotateWithCommit(
  repoPath: string,
  drift: DriftFinding
): Promise<string> {
  if (drift.kind !== "dependency-removed") {
    return "unknown (architecture/framework changes span many files — check `git log` on the relevant directories)";
  }
  const commit = await findIntroducingCommit(repoPath, "package.json", drift.expected);
  if (!commit) {
    return "unknown (no matching commit found in git history for package.json — shallow clone, or never committed)";
  }
  return `${commit.hash} (${commit.date}) — ${commit.message}`;
}

export function registerDriftCommand(program: Command): void {
  program
    .command("drift")
    .description(
      "Flag when the codebase's actual stack/patterns no longer match the constitution (read-only)"
    )
    .option("-p, --path <path>", "path to the repo", ".")
    .option(
      "-c, --constitution <path>",
      "path to the constitution file",
      ".guardrail/constitution.md"
    )
    .option(
      "--strict",
      "exit non-zero when drift is found (default: drift is a warning signal, not a hard failure)",
      false
    )
    .action(async (opts: { path: string; constitution: string; strict: boolean }) => {
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

      if (!constitution.declaredStack) {
        console.log(
          "This constitution has no declared-stack snapshot to compare against " +
            "(it predates this feature, or was hand-written without one).\n" +
            "Run `guardrail init --force` to capture one, then `guardrail drift` will have a baseline."
        );
        process.exitCode = 0;
        return;
      }

      const fresh = runAllDetectors(repoPath);
      const drifts = computeDrift(constitution, fresh);

      if (drifts.length === 0) {
        console.log("No drift detected — the codebase still matches the constitution's declared stack. ✓");
        process.exitCode = 0;
        return;
      }

      console.log(`${drifts.length} drift signal(s) found:\n`);
      for (const drift of drifts) {
        console.log(`- [${drift.kind}] expected "${drift.expected}", currently: ${drift.actual}`);
        const introducedAround = await annotateWithCommit(repoPath, drift);
        console.log(`    introduced around: ${introducedAround}`);
        console.log("");
      }
      console.log(
        "Drift is a signal, not a hard failure by default — review whether the constitution " +
          "should be updated (`guardrail init --force`) to reflect this change, or whether the " +
          "change itself needs reverting. Pass --strict to fail CI on drift."
      );

      process.exitCode = opts.strict ? 1 : 0;
    });
}
