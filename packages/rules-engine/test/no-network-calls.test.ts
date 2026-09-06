import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Design-rule guard: every deterministic check must work with zero network
 * calls. This walks the deterministic packages' source and fails if it
 * finds a `fetch(`/`http.request`/`https.request` call anywhere outside of
 * comments-only matches — the `semantic` enforcement path (Phase 5,
 * `--semantic`) is opt-in and lives in the CLI, not in these packages.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "test") continue;
      walk(full, out);
    } else if (entry.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

const PACKAGES_TO_CHECK = ["core", "parser", "rules-engine", "scanner", "detectors"];
const NETWORK_PATTERNS = [/\bfetch\s*\(/, /\bhttp\.request\s*\(/, /\bhttps\.request\s*\(/];

describe("deterministic packages make zero network calls", () => {
  for (const pkg of PACKAGES_TO_CHECK) {
    it(`packages/${pkg}/src has no fetch/http(s).request calls`, () => {
      const dir = resolve(__dirname, `../../${pkg}/src`);
      let files: string[];
      try {
        files = walk(dir);
      } catch {
        files = [];
      }
      const offenders: string[] = [];
      for (const file of files) {
        const content = readFileSync(file, "utf-8");
        if (NETWORK_PATTERNS.some((re) => re.test(content))) {
          offenders.push(file);
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
