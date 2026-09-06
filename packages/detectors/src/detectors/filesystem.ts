import { existsSync } from "node:fs";
import { resolve } from "node:path";
import fg from "fast-glob";
import type { ArchitecturePattern, FilesystemFinding } from "../types.js";

/**
 * Infers a coarse architecture pattern from a small, fixed set of folder-name
 * matchers — deliberately not a general classifier. Checked in order of
 * specificity; the first match wins.
 */
export function detectFilesystem(repoPath: string): FilesystemFinding {
  const has = (glob: string): boolean =>
    fg.sync(glob, { cwd: repoPath, onlyDirectories: true, dot: false }).length > 0;

  const featureBased = has("src/features/*") || has("features/*");
  if (featureBased) {
    return {
      pattern: "feature-based" as ArchitecturePattern,
      evidence: ["src/features/* (or features/*) directories present"],
    };
  }

  const mvcDirs = ["controllers", "models", "views"].map((d) => `src/${d}`);
  const mvcHits = mvcDirs.filter((d) => existsSync(resolve(repoPath, d)));
  if (mvcHits.length >= 2) {
    return { pattern: "mvc" as ArchitecturePattern, evidence: mvcHits };
  }

  const layeredDirs = ["api", "services", "database", "repositories"].map((d) => `src/${d}`);
  const layeredHits = layeredDirs.filter((d) => existsSync(resolve(repoPath, d)));
  if (layeredHits.length >= 2) {
    return { pattern: "layered" as ArchitecturePattern, evidence: layeredHits };
  }

  return { pattern: "unknown" as ArchitecturePattern, evidence: [] };
}
