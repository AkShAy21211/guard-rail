import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseConstitution } from "@guardrail/parser";
import { runChecks } from "../src/runChecks.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../../../examples/nextjs");

describe("runChecks (integration, examples/nextjs fixture)", () => {
  it("reports the planted cross-feature-import and forbidden-dependency violations", () => {
    const constitution = parseConstitution(resolve(repoRoot, ".guardrail/constitution.md"));
    const violations = runChecks(constitution, repoRoot);

    const boundaryViolation = violations.find((v) => v.ruleId === "no-cross-feature-imports");
    expect(boundaryViolation).toBeDefined();
    expect(boundaryViolation?.file).toBe("src/features/billing/index.ts");
    expect(boundaryViolation?.severity).toBe("error");

    const dependencyViolation = violations.find((v) => v.ruleId === "no-moment");
    expect(dependencyViolation).toBeDefined();
    expect(dependencyViolation?.severity).toBe("warning");
  });

  it("--diff semantics: restricting to an unrelated changed file suppresses the violation", () => {
    const constitution = parseConstitution(resolve(repoRoot, ".guardrail/constitution.md"));
    const violations = runChecks(constitution, repoRoot, {
      changedFiles: new Set(["README.md"]),
    });
    expect(violations).toHaveLength(0);
  });

  it("--diff semantics: including the violating file surfaces the violation", () => {
    const constitution = parseConstitution(resolve(repoRoot, ".guardrail/constitution.md"));
    const violations = runChecks(constitution, repoRoot, {
      changedFiles: new Set(["src/features/billing/index.ts"]),
    });
    expect(violations.some((v) => v.ruleId === "no-cross-feature-imports")).toBe(true);
  });
});
