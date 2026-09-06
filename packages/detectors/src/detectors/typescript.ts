import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { TypescriptFinding } from "../types.js";

/** Detects TypeScript usage: presence of tsconfig.json and the declared (not necessarily installed) version. */
export function detectTypescript(repoPath: string): TypescriptFinding {
  const present = existsSync(resolve(repoPath, "tsconfig.json"));

  let declaredVersion: string | null = null;
  const pkgPath = resolve(repoPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      declaredVersion =
        pkg.devDependencies?.typescript ?? pkg.dependencies?.typescript ?? null;
    } catch {
      // ignore malformed package.json here — dependencies detector will surface it
    }
  }

  return { present, declaredVersion };
}
