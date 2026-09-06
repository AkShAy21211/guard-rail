import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  detectTypescript,
  detectFramework,
  detectFilesystem,
  detectNaming,
  detectDependencies,
  runAllDetectors,
} from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => resolve(__dirname, "fixtures", name);

describe("detectTypescript", () => {
  it("detects tsconfig.json presence and declared version", () => {
    const finding = detectTypescript(fixture("feature-based"));
    expect(finding.present).toBe(true);
    expect(finding.declaredVersion).toBe("^5.6.3");
  });
});

describe("detectFramework", () => {
  it("detects Next.js and React from package.json", () => {
    const finding = detectFramework(fixture("feature-based"));
    expect(finding.frameworks).toContain("Next.js");
    expect(finding.frameworks).toContain("React");
  });
});

describe("detectFilesystem", () => {
  it("recognizes a feature-based layout", () => {
    const finding = detectFilesystem(fixture("feature-based"));
    expect(finding.pattern).toBe("feature-based");
  });

  it("falls back to unknown when no recognized pattern is present", () => {
    const finding = detectFilesystem(fixture("mixed-naming"));
    expect(finding.pattern).toBe("unknown");
  });
});

describe("detectNaming", () => {
  it("infers PascalCase for a consistent components/ folder", () => {
    const finding = detectNaming(fixture("feature-based"));
    const components = finding.byFolder.find((f) => f.folder === "components");
    expect(components?.casing).toBe("PascalCase");
    expect(components?.sampleSize).toBe(2);
    expect(components?.confidence).toBe(1);
  });

  it("marks a folder as mixed/undetected when casing is inconsistent", () => {
    const finding = detectNaming(fixture("mixed-naming"));
    const components = finding.byFolder.find((f) => f.folder === "components");
    expect(components?.casing).toBe("mixed/undetected");
  });
});

describe("detectDependencies", () => {
  it("lists direct and dev dependencies", () => {
    const finding = detectDependencies(fixture("feature-based"));
    expect(finding.dependencies).toEqual(expect.arrayContaining(["next", "react"]));
    expect(finding.devDependencies).toEqual(["typescript"]);
  });
});

describe("runAllDetectors", () => {
  it("combines every detector's output", () => {
    const findings = runAllDetectors(fixture("feature-based"));
    expect(findings.typescript.present).toBe(true);
    expect(findings.filesystem.pattern).toBe("feature-based");
    expect(findings.framework.frameworks.length).toBeGreaterThan(0);
  });
});
