import micromatch from "micromatch";

/**
 * Normalizes a path to forward slashes. Needed because `node:path`'s
 * `relative()`/`resolve()` return backslash-separated paths on Windows,
 * while every other path Guardrail produces or compares against (glob
 * results from fast-glob, git's `--name-only` output, and the globs in a
 * constitution itself) is forward-slash. Every path that ends up in a
 * Violation's `file` field, or gets compared against a glob, should be
 * normalized with this first.
 */
export function toPosixPath(candidate: string): string {
  return candidate.split("\\").join("/");
}

/** Test a (relative, forward-slash-friendly) path or specifier against a list of glob patterns. */
export function matchesAnyGlob(candidate: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  return micromatch.isMatch(toPosixPath(candidate), patterns, { dot: true });
}
