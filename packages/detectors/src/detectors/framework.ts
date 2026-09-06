import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkFinding } from "../types.js";

/** Known framework/library package names mapped to a human-readable label. */
const KNOWN_FRAMEWORKS: Record<string, string> = {
  next: "Next.js",
  react: "React",
  "react-dom": "React",
  vue: "Vue",
  svelte: "Svelte",
  "@angular/core": "Angular",
  express: "Express",
  fastify: "Fastify",
  koa: "Koa",
  "@nestjs/core": "NestJS",
  hapi: "Hapi",
};

/** Detects known frameworks by reading package.json dependencies + devDependencies. Zero network access. */
export function detectFramework(repoPath: string): FrameworkFinding {
  const pkgPath = resolve(repoPath, "package.json");
  if (!existsSync(pkgPath)) return { frameworks: [] };

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  } catch {
    return { frameworks: [] };
  }

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const found = new Set<string>();
  for (const depName of Object.keys(deps)) {
    const label = KNOWN_FRAMEWORKS[depName];
    if (label) found.add(label);
  }

  return { frameworks: [...found] };
}
