import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createRequire } from "node:module";
import fg from "fast-glob";
import type { Rule, Violation } from "@guardrail/core";
import type { Ignore, Options as IgnoreOptions } from "ignore";

// `ignore`'s type declarations don't play well with NodeNext's ESM default-import
// interop, so load it via createRequire (it's a plain CJS package at runtime).
const require = createRequire(import.meta.url);
const ignoreFactory: (options?: IgnoreOptions) => Ignore = require("ignore");

interface SecretPattern {
  name: string;
  regex: RegExp;
}

// Common secret formats. Kept deliberately conservative (few false positives)
// — the Shannon-entropy pass below catches the long tail of ad-hoc tokens.
const SECRET_PATTERNS: SecretPattern[] = [
  { name: "AWS Access Key ID", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Private Key Block", regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: "Slack Token", regex: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: "GitHub Token", regex: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  {
    name: "Generic API key/secret assignment",
    regex: /(api[_-]?key|secret|token|password)\s*[:=]\s*["'`][A-Za-z0-9_\-.]{16,}["'`]/i,
  },
];

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".gz", ".woff", ".woff2",
  ".ttf", ".eot", ".mp4", ".mov", ".webp", ".lock",
]);

const DEFAULT_IGNORES = ["node_modules", ".git", "dist", "build", "coverage", "pnpm-lock.yaml"];

const STRING_LITERAL_RE = /["'`]([A-Za-z0-9+/_=\-]{24,})["'`]/g;
const ENTROPY_THRESHOLD = 4.0;

function shannonEntropy(value: string): number {
  const freq = new Map<string, number>();
  for (const ch of value) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / value.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function loadIgnoreFilter(repoPath: string) {
  const ig = ignoreFactory();
  ig.add(DEFAULT_IGNORES);
  const gitignorePath = resolve(repoPath, ".gitignore");
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, "utf-8"));
  }
  return ig;
}

/**
 * Scans files matching `rule.scope` (honoring .gitignore) for common secret
 * patterns plus high-entropy string literals over a length threshold.
 */
export function checkSecretScan(rule: Rule, repoPath: string): Violation[] {
  if (rule.enforcement.type !== "secret-scan") return [];
  const violations: Violation[] = [];
  const ig = loadIgnoreFilter(repoPath);

  const matched = fg.sync(rule.scope, { cwd: repoPath, dot: true, onlyFiles: true });
  const relFiles = matched.filter((relPath) => !ig.ignores(relPath));

  for (const relPath of relFiles) {
    if (BINARY_EXTENSIONS.has(extname(relPath).toLowerCase())) continue;

    const absPath = resolve(repoPath, relPath);
    let content: string;
    try {
      content = readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }
    if (content.includes("\u0000")) continue; // likely binary

    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            file: relPath,
            line: idx + 1,
            message: `${rule.description} (matched pattern: ${pattern.name})`,
          });
          return;
        }
      }

      STRING_LITERAL_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = STRING_LITERAL_RE.exec(line))) {
        const candidate = match[1] ?? "";
        if (candidate.length >= 24 && shannonEntropy(candidate) >= ENTROPY_THRESHOLD) {
          violations.push({
            ruleId: rule.id,
            severity: rule.severity,
            file: relPath,
            line: idx + 1,
            message: `${rule.description} (high-entropy string literal, possible secret)`,
          });
          break;
        }
      }
    });
  }

  return violations;
}
