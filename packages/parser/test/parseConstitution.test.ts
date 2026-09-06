import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseConstitution, ConstitutionParseError } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => resolve(__dirname, "fixtures", name);

describe("parseConstitution", () => {
  it("parses a valid constitution file correctly", () => {
    const constitution = parseConstitution(fixture("valid.md"));
    expect(constitution.version).toBe(1);
    expect(constitution.project.name).toBe("acme-app");
    expect(constitution.rules).toHaveLength(2);
    expect(constitution.rules[0]?.id).toBe("no-cross-feature-imports");
    expect(constitution.rules[0]?.enforcement.type).toBe("import-boundary");
    expect(constitution.rules[1]?.enforcement.type).toBe("secret-scan");
  });

  it("fails with a clear, actionable message when a required field is missing", () => {
    expect(() => parseConstitution(fixture("missing-field.md"))).toThrow(
      ConstitutionParseError
    );
    try {
      parseConstitution(fixture("missing-field.md"));
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConstitutionParseError);
      const message = (err as Error).message;
      expect(message).toContain("project");
      expect(message).toContain("Invalid constitution");
    }
  });

  it("fails when an enforcement type is not one of the known union members", () => {
    expect(() => parseConstitution(fixture("bad-enum.md"))).toThrow(
      ConstitutionParseError
    );
    try {
      parseConstitution(fixture("bad-enum.md"));
      expect.unreachable();
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain("enforcement");
    }
  });

  it("fails with a clear message on malformed YAML", () => {
    expect(() => parseConstitution(fixture("malformed-yaml.md"))).toThrow(
      ConstitutionParseError
    );
    try {
      parseConstitution(fixture("malformed-yaml.md"));
      expect.unreachable();
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain("Malformed YAML frontmatter");
    }
  });

  it("parses a pure-prose constitution (no frontmatter) with an empty rules array", () => {
    const constitution = parseConstitution(fixture("prose-only.md"));
    expect(constitution.rules).toEqual([]);
    expect(constitution.project.name).toBe("Acme App");
    expect(constitution.version).toBe(1);
  });
});
