import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { renderConstitution, parseConstitution } from "@guardrail/parser";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { buildDraftConstitution, runAllDetectors } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => resolve(__dirname, "../../detectors/test/fixtures", name);

describe("buildDraftConstitution", () => {
  it("always includes a baseline no-secrets rule", () => {
    const draft = buildDraftConstitution(fixture("mixed-naming"));
    expect(draft.rules.some((r) => r.id === "no-secrets")).toBe(true);
  });

  it("drafts a naming rule reflecting the repo's own dominant convention", () => {
    const draft = buildDraftConstitution(fixture("feature-based"));
    const namingRule = draft.rules.find((r) => r.id === "components-naming");
    expect(namingRule).toBeDefined();
    expect(namingRule?.enforcement).toMatchObject({ type: "naming", pattern: "^[A-Z][A-Za-z0-9]*$" });
  });

  it("does not draft a naming rule when the folder's casing is mixed/undetected", () => {
    const draft = buildDraftConstitution(fixture("mixed-naming"));
    expect(draft.rules.some((r) => r.id === "components-naming")).toBe(false);
  });

  it("round-trips through renderConstitution + parseConstitution", () => {
    const draft = buildDraftConstitution(fixture("feature-based"), runAllDetectors(fixture("feature-based")));
    const rendered = renderConstitution(draft);

    const dir = mkdtempSync(resolve(tmpdir(), "guardrail-scanner-test-"));
    const filePath = resolve(dir, "constitution.md");
    writeFileSync(filePath, rendered, "utf-8");

    const reparsed = parseConstitution(filePath);
    expect(reparsed).toEqual(draft);
  });
});
