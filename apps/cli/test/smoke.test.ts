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

  it("runs each stub command and exits 0", () => {
    for (const cmd of ["init", "check", "sync", "scan"]) {
      const output = execFileSync("node", [CLI_BIN, cmd], {
        encoding: "utf-8",
      });
      expect(output).toContain(`${cmd} not yet implemented`);
    }
  });
});
