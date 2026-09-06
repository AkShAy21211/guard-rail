import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { DependenciesFinding } from "../types.js";

/**
 * Lists declared dependencies/devDependencies from package.json. Deliberately
 * does NOT flag deprecated packages — that would require a network call
 * (registry lookup), which this detector (like every deterministic Guardrail
 * check) must not make.
 */
export function detectDependencies(repoPath: string): DependenciesFinding {
  const pkgPath = resolve(repoPath, "package.json");
  if (!existsSync(pkgPath)) return { dependencies: [], devDependencies: [] };

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    return {
      dependencies: Object.keys(pkg.dependencies ?? {}),
      devDependencies: Object.keys(pkg.devDependencies ?? {}),
    };
  } catch {
    return { dependencies: [], devDependencies: [] };
  }
}
