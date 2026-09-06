import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Rule } from "@guardrail/core";
import { checkImportBoundary } from "../src/checks/import-boundary.js";
import { checkSecretScan } from "../src/checks/secret-scan.js";
import { checkForbiddenDependency } from "../src/checks/forbidden-dependency.js";
import { checkNaming } from "../src/checks/naming.js";
import { checkFilePlacement } from "../src/checks/file-placement.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => resolve(__dirname, "fixtures", name);

function rule(overrides: Partial<Rule> & Pick<Rule, "enforcement">): Rule {
  return {
    id: "test-rule",
    description: "test rule description",
    severity: "error",
    scope: ["**"],
    ...overrides,
  };
}

describe("checkImportBoundary", () => {
  const repoPath = fixture("import-boundary");

  it("flags a violating cross-feature import", () => {
    const violations = checkImportBoundary(
      rule({
        scope: ["src/features/billing/violating.ts"],
        enforcement: { type: "import-boundary", deny: ["src/features/*/*"] },
      }),
      repoPath
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.file).toBe("src/features/billing/violating.ts");
    expect(violations[0]?.line).toBeGreaterThan(0);
  });

  it("does not flag a clean file with no cross-feature imports", () => {
    const violations = checkImportBoundary(
      rule({
        scope: ["src/features/billing/clean.ts"],
        enforcement: { type: "import-boundary", deny: ["src/features/*/*"] },
      }),
      repoPath
    );
    expect(violations).toHaveLength(0);
  });
});

describe("checkSecretScan", () => {
  const repoPath = fixture("secret-scan");

  it("flags an AWS access key and a high-entropy assignment", () => {
    const violations = checkSecretScan(
      rule({ scope: ["violating.ts"], enforcement: { type: "secret-scan" } }),
      repoPath
    );
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations.some((v) => v.file === "violating.ts")).toBe(true);
  });

  it("does not flag an ordinary short string literal", () => {
    const violations = checkSecretScan(
      rule({ scope: ["clean.ts"], enforcement: { type: "secret-scan" } }),
      repoPath
    );
    expect(violations).toHaveLength(0);
  });
});

describe("checkForbiddenDependency", () => {
  const repoPath = fixture("forbidden-dependency");

  it("flags a denied dependency present in package.json", () => {
    const violations = checkForbiddenDependency(
      rule({ enforcement: { type: "forbidden-dependency", deny: ["moment"] } }),
      repoPath
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.message).toContain("moment");
  });

  it("does not flag when the denied dependency is absent", () => {
    const violations = checkForbiddenDependency(
      rule({ enforcement: { type: "forbidden-dependency", deny: ["lodash"] } }),
      repoPath
    );
    expect(violations).toHaveLength(0);
  });
});

describe("checkNaming", () => {
  const repoPath = fixture("naming");

  it("flags a filename that does not match the required pattern", () => {
    const violations = checkNaming(
      rule({
        scope: ["src/components/**/*.tsx"],
        enforcement: { type: "naming", pattern: "^[A-Z][A-Za-z0-9]*$" },
      }),
      repoPath
    );
    expect(violations.map((v) => v.file)).toContain("src/components/bad-component.tsx");
    expect(violations.map((v) => v.file)).not.toContain("src/components/GoodComponent.tsx");
  });
});

describe("checkFilePlacement", () => {
  const repoPath = fixture("file-placement");

  it("flags a file outside the allowed paths", () => {
    const violations = checkFilePlacement(
      rule({
        scope: ["**/*Service.ts"],
        enforcement: { type: "file-placement", allowedPaths: ["src/services/**"] },
      }),
      repoPath
    );
    expect(violations.map((v) => v.file)).toContain("src/misplaced/BadService.ts");
    expect(violations.map((v) => v.file)).not.toContain("src/services/GoodService.ts");
  });
});
