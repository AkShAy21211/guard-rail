import { describe, it, expect } from "vitest";
import type { Constitution } from "@guardrail/core";
import type { DetectorFindings } from "@guardrail/detectors";
import { computeDrift } from "../src/index.js";

function baseConstitution(overrides: Partial<Constitution> = {}): Constitution {
  return {
    version: 1,
    project: { name: "drift-fixture" },
    rules: [],
    declaredStack: {
      frameworks: ["Express"],
      architecturePattern: "layered",
      dependencies: ["pg", "prisma", "express"],
    },
    ...overrides,
  };
}

function baseFindings(overrides: Partial<DetectorFindings> = {}): DetectorFindings {
  return {
    typescript: { present: false, declaredVersion: null },
    framework: { frameworks: ["Express"] },
    filesystem: { pattern: "layered", evidence: [] },
    naming: { byFolder: [] },
    dependencies: { dependencies: ["pg", "prisma", "express"], devDependencies: [] },
    ...overrides,
  };
}

describe("computeDrift", () => {
  it("returns no drift when nothing changed", () => {
    expect(computeDrift(baseConstitution(), baseFindings())).toEqual([]);
  });

  it("returns [] when the constitution has no declaredStack snapshot", () => {
    const constitution = baseConstitution({ declaredStack: undefined });
    expect(computeDrift(constitution, baseFindings())).toEqual([]);
  });

  it("flags a removed dependency (e.g. Postgres/Prisma swapped for MongoDB/Mongoose)", () => {
    const fresh = baseFindings({
      dependencies: { dependencies: ["mongodb", "mongoose", "express"], devDependencies: [] },
    });
    const drifts = computeDrift(baseConstitution(), fresh);
    const kinds = drifts.map((d) => `${d.kind}:${d.expected}`);
    expect(kinds).toContain("dependency-removed:pg");
    expect(kinds).toContain("dependency-removed:prisma");
    expect(kinds).not.toContain("dependency-removed:express");
  });

  it("does not flag a newly added dependency that wasn't previously declared", () => {
    const fresh = baseFindings({
      dependencies: { dependencies: ["pg", "prisma", "express", "lodash"], devDependencies: [] },
    });
    expect(computeDrift(baseConstitution(), fresh)).toEqual([]);
  });

  it("flags a removed framework", () => {
    const fresh = baseFindings({ framework: { frameworks: [] } });
    const drifts = computeDrift(baseConstitution(), fresh);
    expect(drifts.some((d) => d.kind === "framework-removed" && d.expected === "Express")).toBe(true);
  });

  it("flags a changed architecture pattern", () => {
    const fresh = baseFindings({ filesystem: { pattern: "feature-based", evidence: [] } });
    const drifts = computeDrift(baseConstitution(), fresh);
    expect(
      drifts.some(
        (d) => d.kind === "architecture-changed" && d.expected === "layered" && d.actual === "feature-based"
      )
    ).toBe(true);
  });
});
