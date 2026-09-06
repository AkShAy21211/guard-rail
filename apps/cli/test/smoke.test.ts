import { describe, it, expect, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolve(__dirname, "../dist/bin/guardrail.js");

describe("guardrail CLI smoke test", () => {
  it("prints help listing all four core commands", () => {
    const output = execFileSync("node", [CLI_BIN, "--help"], {
      encoding: "utf-8",
    });
    expect(output).toContain("init");
    expect(output).toContain("check");
    expect(output).toContain("sync");
    expect(output).toContain("scan");
  });

  it("check exits 0 on a clean repo and non-zero when violations exist", () => {
    const nextjsFixture = resolve(__dirname, "../../../examples/nextjs");
    expect(() =>
      execFileSync("node", [CLI_BIN, "check", "--path", nextjsFixture], {
        encoding: "utf-8",
      })
    ).toThrow(); // planted violations => non-zero exit

    const sampleFixture = resolve(__dirname, "../../../examples/sample");
    // examples/sample's rules target files that don't exist in this minimal
    // fixture, so it should pass cleanly.
    const output = execFileSync("node", [CLI_BIN, "check", "--path", sampleFixture], {
      encoding: "utf-8",
    });
    expect(output).toContain("No violations found");
  });

  describe("scan / init (isolated temp fixture — must never touch the real repo)", () => {
    const tmpDir = mkdtempSync(resolve(tmpdir(), "guardrail-cli-smoke-"));

    afterAll(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("scan prints findings without writing any files", () => {
      const output = execFileSync("node", [CLI_BIN, "scan", "--path", tmpDir], {
        encoding: "utf-8",
      });
      expect(output).toContain("dry run");
    });

    it("init writes a constitution, and refuses to overwrite it without --force", () => {
      const output = execFileSync("node", [CLI_BIN, "init", "--path", tmpDir], {
        encoding: "utf-8",
      });
      expect(output).toContain("Wrote .guardrail/constitution.md");

      expect(() =>
        execFileSync("node", [CLI_BIN, "init", "--path", tmpDir], { encoding: "utf-8" })
      ).toThrow();
    });

    it("sync generates CLAUDE.md/AGENTS.md/copilot-instructions/cursor rules from the constitution just written", () => {
      const output = execFileSync("node", [CLI_BIN, "sync", "--path", tmpDir], {
        encoding: "utf-8",
      });
      expect(output).toContain("CLAUDE.md");
      expect(output).toContain("AGENTS.md");
      expect(output).toContain(".github/copilot-instructions.md");
    });
  });
});
