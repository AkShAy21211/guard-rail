import micromatch from "micromatch";

/** Test a (relative, forward-slash-friendly) path or specifier against a list of glob patterns. */
export function matchesAnyGlob(candidate: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const normalized = candidate.split("\\").join("/");
  return micromatch.isMatch(normalized, patterns, { dot: true });
}
