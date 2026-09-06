import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { findIntroducingCommit } from "../src/diff.js";

describe("findIntroducingCommit", () => {
  let repoPath: string;

  beforeAll(() => {
    repoPath = mkdtempSync(resolve(tmpdir(), "guardrail-commit-test-"));
    const run = (cmd: string) => execSync(cmd, { cwd: repoPath, stdio: "pipe" });

    run("git init -q");
    run('git config user.email "t@t.com"');
    run('git config user.name "t"');

    writeFileSync(resolve(repoPath, "package.json"), JSON.stringify({ dependencies: { pg: "^8.0.0" } }));
    run("git add -A");
    run('git commit -q -m "add pg"');

    writeFileSync(
      resolve(repoPath, "package.json"),
      JSON.stringify({ dependencies: { mongodb: "^6.0.0" } })
    );
    run("git add -A");
    run('git commit -q -m "swap pg for mongodb"');
  });

  afterAll(() => {
    rmSync(repoPath, { recursive: true, force: true });
  });

  it("finds the commit that removed a dependency string from package.json", async () => {
    const commit = await findIntroducingCommit(repoPath, "package.json", "pg");
    expect(commit).not.toBeNull();
    expect(commit?.message).toContain("swap pg for mongodb");
  });

  it("returns null for a string that was never in the file's history", async () => {
    const commit = await findIntroducingCommit(repoPath, "package.json", "totally-unrelated-package");
    expect(commit).toBeNull();
  });
});
