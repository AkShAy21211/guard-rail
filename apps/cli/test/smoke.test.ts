import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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

  it("runs each still-stubbed command and exits 0", () => {
    // `check` is implemented as of Phase 3 and is exercised separately below;
    // the rest are still Phase 4/5 stubs.
    for (const cmd of ["init", "sync", "scan"]) {
      const output = execFileSync("node", [CLI_BIN, cmd], {
        encoding: "utf-8",
      });
      expect(output).toContain(`${cmd} not yet implemented`);
    }
  });

  it("check exits 0 on a clean repo and non-zero when violations exist", () => {
    const nextjsFixture = resolve(__dirname, "../../../examples/nextjs");
    expect(() =>
      execFileSync("node", [CLI_BIN, "check", "--path", nextjsFixture], {
        encoding: "utf-8",
      })
    ).toThrow(); // planted violations => non-zero exit

    const sampleFixture = resolve(__dirname, "../../../examples/sample");
    // examples/sample has no planted violations to trip error/critical severities
    // in its own files (its rules target files that don't exist in this minimal
    // fixture), so it should pass cleanly.
    const output = execFileSync("node", [CLI_BIN, "check", "--path", sampleFixture], {
      encoding: "utf-8",
    });
    expect(output).toContain("No violations found");
  });
});
