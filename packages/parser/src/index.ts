import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { ConstitutionSchema, type Constitution } from "@guardrail/core";
import type { ZodIssue } from "zod";

/**
 * Guardrail constitution format
 * =============================
 * A `.guardrail/constitution.md` file is a Markdown document with an
 * OPTIONAL YAML frontmatter block at the very top:
 *
 *   ---
 *   version: 1
 *   project:
 *     name: my-app
 *   rules:
 *     - id: no-cross-feature-imports
 *       description: Features may not import from each other directly.
 *       severity: error
 *       scope: ["src/features/**"]
 *       enforcement:
 *         type: import-boundary
 *         deny: ["src/features/*\/*"]
 *   ---
 *
 *   # My App
 *
 *   Free-form prose goes here: architecture rationale, conventions, context
 *   for humans and agents. This body is never parsed as structured data —
 *   it's included verbatim when generating agent instruction files.
 *
 * All structured/enforceable data (version, project, rules) lives in the
 * frontmatter. This is the one convention Guardrail supports (as opposed to
 * scattering multiple fenced ```yaml blocks through the body) because a
 * single frontmatter block is unambiguous to locate, easy to round-trip
 * when `guardrail init`/`sync` rewrite the file, and familiar from
 * Jekyll/Hugo-style tooling.
 *
 * A constitution with NO frontmatter at all is valid too — it's treated as
 * a pure-prose file with zero structured rules. The project name is then
 * inferred from the first `# Heading` in the body, falling back to the
 * parent directory name.
 */

export class ConstitutionParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConstitutionParseError";
  }
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function inferProjectName(body: string, filePath: string): string {
  const headingMatch = body.match(/^#\s+(.+)$/m);
  if (headingMatch && headingMatch[1]?.trim()) {
    return headingMatch[1].trim();
  }
  // filePath is typically <project-root>/.guardrail/constitution.md
  const projectRoot = resolve(dirname(filePath), "..");
  const inferred = basename(projectRoot);
  return inferred && inferred !== "." ? inferred : "unnamed-project";
}

/** Best-effort line lookup for a top-level (or dotted) frontmatter key, for error messages. */
function findLineForPath(frontmatterText: string, path: (string | number)[]): number | null {
  const key = path.find((segment) => typeof segment === "string");
  if (typeof key !== "string") return null;
  const lines = frontmatterText.split("\n");
  const pattern = new RegExp(`^\\s*${key}\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i] ?? "")) return i + 1; // 1-indexed within the frontmatter block
  }
  return null;
}

function formatZodIssues(
  issues: ZodIssue[],
  frontmatterText: string,
  frontmatterStartLine: number,
  filePath: string
): string {
  const lines = issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    const localLine = findLineForPath(frontmatterText, issue.path);
    const lineInfo =
      localLine !== null ? ` (around line ${frontmatterStartLine + localLine})` : "";
    return `  - ${path}: ${issue.message}${lineInfo}`;
  });
  return (
    `Invalid constitution in ${filePath}:\n` +
    lines.join("\n") +
    `\n\nSee https://github.com/guardrail/guardrail#constitution-format for the expected shape.`
  );
}

/**
 * Parse and validate a `.guardrail/constitution.md` file into a typed
 * Constitution object. Throws ConstitutionParseError with a human-readable,
 * actionable message (including line context where possible) on invalid
 * input.
 */
export function parseConstitution(filePath: string): Constitution {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    throw new ConstitutionParseError(
      `Could not read constitution file at ${filePath}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const match = raw.match(FRONTMATTER_RE);

  if (!match) {
    // Pure-prose constitution: no frontmatter, no structured rules.
    const projectName = inferProjectName(raw, filePath);
    const result = ConstitutionSchema.safeParse({
      version: 1,
      project: { name: projectName },
      rules: [],
    });
    if (!result.success) {
      // Should be unreachable (we control this shape), but fail loudly if not.
      throw new ConstitutionParseError(
        formatZodIssues(result.error.issues, "", 0, filePath)
      );
    }
    return result.data;
  }

  const frontmatterText = match[1] ?? "";
  const frontmatterStartLine = 1; // "---" is line 1; frontmatter content starts at line 2

  let parsedYaml: unknown;
  try {
    parsedYaml = parseYaml(frontmatterText);
  } catch (err) {
    const linePos = (err as { linePos?: Array<{ line: number; col: number }> }).linePos;
    const where = linePos?.[0]
      ? ` at line ${frontmatterStartLine + linePos[0].line}, column ${linePos[0].col}`
      : "";
    throw new ConstitutionParseError(
      `Malformed YAML frontmatter in ${filePath}${where}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const result = ConstitutionSchema.safeParse(parsedYaml ?? {});
  if (!result.success) {
    throw new ConstitutionParseError(
      formatZodIssues(result.error.issues, frontmatterText, frontmatterStartLine, filePath)
    );
  }

  return result.data;
}

/**
 * Returns the free-form Markdown body of a constitution file — everything
 * after the frontmatter block (or the whole file, trimmed, if there's no
 * frontmatter). Used by `guardrail sync` to carry human-written
 * architecture notes into the generated agent instruction files verbatim.
 */
export function extractProse(filePath: string): string {
  const raw = readFileSync(filePath, "utf-8");
  const match = raw.match(FRONTMATTER_RE);
  return match ? raw.slice(match[0].length).trim() : raw.trim();
}

export { ConstitutionSchema } from "@guardrail/core";
export type { Constitution, Rule, Enforcement, Severity } from "@guardrail/core";
export { renderConstitution } from "./render.js";
export type { RenderOptions } from "./render.js";
