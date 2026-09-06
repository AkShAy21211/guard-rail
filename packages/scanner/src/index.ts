import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { runAllDetectors } from "@guardrail/detectors";
import type { DetectorFindings, Casing } from "@guardrail/detectors";
import type { Constitution, Rule } from "@guardrail/core";

export { runAllDetectors } from "@guardrail/detectors";
export type { DetectorFindings } from "@guardrail/detectors";

function inferProjectName(repoPath: string): string {
  const pkgPath = resolve(repoPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (typeof pkg.name === "string" && pkg.name.trim()) return pkg.name.trim();
    } catch {
      // fall through to directory-name inference
    }
  }
  const base = basename(resolve(repoPath));
  return base && base !== "." ? base : "unnamed-project";
}

const CASING_PATTERNS: Partial<Record<Casing, string>> = {
  PascalCase: "^[A-Z][A-Za-z0-9]*$",
  camelCase: "^[a-z][A-Za-z0-9]*$",
  "kebab-case": "^[a-z0-9]+(-[a-z0-9]+)*$",
  snake_case: "^[a-z0-9]+(_[a-z0-9]+)*$",
};

const MIN_SAMPLE_SIZE_FOR_RULE = 2;

/**
 * Combines detector findings into a draft Constitution. Deliberately
 * conservative: the only rules generated are ones that reflect what's
 * ALREADY true of the repo (its own dominant naming convention) plus one
 * universal safety default (secret scanning) — never an architectural
 * opinion Guardrail invented. That's what "review this file" (Phase 4 DoD)
 * exists for.
 */
export function buildDraftConstitution(
  repoPath: string,
  findings: DetectorFindings = runAllDetectors(repoPath)
): Constitution {
  const rules: Rule[] = [];

  rules.push({
    id: "no-secrets",
    description:
      "No hardcoded credentials, API keys, or high-entropy secrets anywhere in the repo.",
    severity: "warning",
    scope: ["**"],
    enforcement: { type: "secret-scan" },
  });

  for (const folder of findings.naming.byFolder) {
    if (folder.casing === "mixed/undetected" || folder.sampleSize < MIN_SAMPLE_SIZE_FOR_RULE) {
      continue;
    }
    const pattern = CASING_PATTERNS[folder.casing];
    if (!pattern) continue;

    const extGlob =
      folder.extensions.length > 1 ? `{${folder.extensions.join(",")}}` : folder.extensions[0] ?? "ts";

    rules.push({
      id: `${folder.folder}-naming`,
      description:
        `Files under ${folder.folder}/ follow ${folder.casing} ` +
        `(detected from ${folder.sampleSize} existing file(s), ${Math.round(folder.confidence * 100)}% consistent).`,
      severity: "warning",
      scope: [`**/${folder.folder}/**/*.${extGlob}`],
      enforcement: { type: "naming", pattern },
    });
  }

  return {
    version: 1,
    project: { name: inferProjectName(repoPath) },
    rules,
    declaredStack: {
      frameworks: findings.framework.frameworks,
      architecturePattern: findings.filesystem.pattern,
      dependencies: findings.dependencies.dependencies,
    },
  };
}

export interface DriftFinding {
  kind: "framework-removed" | "dependency-removed" | "architecture-changed";
  /** What the constitution's declaredStack snapshot says. */
  expected: string;
  /** What's actually detected right now. */
  actual: string;
}

/**
 * Compares a constitution's `declaredStack` snapshot (captured by
 * `guardrail init`) against a fresh detector run, and reports what's
 * drifted. Read-only — never touches the constitution or the repo. Returns
 * an empty array (not an error) when the constitution has no snapshot to
 * compare against.
 */
export function computeDrift(constitution: Constitution, fresh: DetectorFindings): DriftFinding[] {
  const declared = constitution.declaredStack;
  if (!declared) return [];

  const findings: DriftFinding[] = [];

  for (const framework of declared.frameworks) {
    if (!fresh.framework.frameworks.includes(framework)) {
      findings.push({
        kind: "framework-removed",
        expected: framework,
        actual: fresh.framework.frameworks.join(", ") || "no frameworks detected",
      });
    }
  }

  for (const dep of declared.dependencies) {
    const stillPresent =
      fresh.dependencies.dependencies.includes(dep) || fresh.dependencies.devDependencies.includes(dep);
    if (!stillPresent) {
      findings.push({
        kind: "dependency-removed",
        expected: dep,
        actual: "not present in package.json",
      });
    }
  }

  if (declared.architecturePattern && declared.architecturePattern !== fresh.filesystem.pattern) {
    findings.push({
      kind: "architecture-changed",
      expected: declared.architecturePattern,
      actual: fresh.filesystem.pattern,
    });
  }

  return findings;
}

/** Human-readable summary of detector findings, used by both `guardrail scan` and `guardrail init`. */
export function formatFindingsSummary(findings: DetectorFindings): string {
  const lines: string[] = [];

  lines.push(
    `TypeScript: ${
      findings.typescript.present
        ? `yes${findings.typescript.declaredVersion ? ` (${findings.typescript.declaredVersion})` : ""}`
        : "no"
    }`
  );
  lines.push(
    `Frameworks: ${
      findings.framework.frameworks.length > 0 ? findings.framework.frameworks.join(", ") : "none detected"
    }`
  );
  lines.push(
    `Architecture pattern: ${findings.filesystem.pattern}` +
      (findings.filesystem.evidence.length > 0 ? ` (${findings.filesystem.evidence.join(", ")})` : "")
  );

  if (findings.naming.byFolder.length > 0) {
    lines.push("Naming conventions:");
    for (const f of findings.naming.byFolder) {
      lines.push(
        `  - ${f.folder}/: ${f.casing} (${f.sampleSize} file(s) sampled, ${Math.round(f.confidence * 100)}% consistent)`
      );
    }
  } else {
    lines.push("Naming conventions: no recognized folders found to sample");
  }

  lines.push(
    `Dependencies: ${findings.dependencies.dependencies.length} direct, ${findings.dependencies.devDependencies.length} dev`
  );

  return lines.join("\n");
}
