import { existsSync } from "node:fs";
import { relative, resolve, dirname, extname } from "node:path";
import { Project } from "ts-morph";
import fg from "fast-glob";
import type { Rule, Violation } from "@guardrail/core";
import { matchesAnyGlob } from "../util.js";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

/** Best-effort manual resolution for relative specifiers, used when ts-morph's language service can't resolve. */
function resolveRelative(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    resolve(base, "index.ts"),
    resolve(base, "index.tsx"),
    resolve(base, "index.js"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

let cachedProject: { repoPath: string; project: Project } | null = null;

function getProject(repoPath: string): Project {
  if (cachedProject && cachedProject.repoPath === repoPath) return cachedProject.project;

  const tsconfigPath = resolve(repoPath, "tsconfig.json");
  const project = existsSync(tsconfigPath)
    ? new Project({ tsConfigFilePath: tsconfigPath })
    : new Project({
        compilerOptions: { allowJs: true, jsx: 2 /* React */, skipLibCheck: true },
        skipAddingFilesFromTsConfig: true,
      });

  cachedProject = { repoPath, project };
  return project;
}

/**
 * Checks a single import-boundary rule: for every file matching `rule.scope`,
 * resolve each import/re-export's target and flag it if the resolved path
 * (or, failing resolution, the raw specifier) matches `enforcement.deny`.
 */
export function checkImportBoundary(rule: Rule, repoPath: string): Violation[] {
  if (rule.enforcement.type !== "import-boundary") return [];
  const { deny } = rule.enforcement;
  const violations: Violation[] = [];

  const project = getProject(repoPath);

  const matchedFiles = fg.sync(rule.scope, {
    cwd: repoPath,
    absolute: true,
    dot: true,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  });

  for (const filePath of matchedFiles) {
    if (!SOURCE_EXTENSIONS.has(extname(filePath))) continue;

    const sourceFile =
      project.getSourceFile(filePath) ??
      (existsSync(filePath) ? project.addSourceFileAtPath(filePath) : undefined);
    if (!sourceFile) continue;

    const specifiers = [
      ...sourceFile.getImportDeclarations().map((d) => ({ decl: d, kind: "import" as const })),
      ...sourceFile.getExportDeclarations().map((d) => ({ decl: d, kind: "export" as const })),
    ];

    for (const { decl } of specifiers) {
      const specifier = decl.getModuleSpecifierValue();
      if (!specifier) continue;

      let candidatePath: string | null = null;
      const resolvedSourceFile = decl.getModuleSpecifierSourceFile();
      if (resolvedSourceFile) {
        candidatePath = relative(repoPath, resolvedSourceFile.getFilePath());
      } else {
        const manuallyResolved = resolveRelative(filePath, specifier);
        if (manuallyResolved) candidatePath = relative(repoPath, manuallyResolved);
      }

      const isDenied =
        (candidatePath !== null && matchesAnyGlob(candidatePath, deny)) ||
        matchesAnyGlob(specifier, deny);

      if (isDenied) {
        violations.push({
          ruleId: rule.id,
          severity: rule.severity,
          file: relative(repoPath, filePath),
          line: decl.getStartLineNumber(),
          message: `${rule.description} (import "${specifier}" resolves to a denied path)`,
        });
      }
    }
  }

  return violations;
}

/** Exposed for tests that want a fresh Project per repo path (avoids cross-test cache bleed). */
export function resetImportBoundaryProjectCache(): void {
  cachedProject = null;
}
