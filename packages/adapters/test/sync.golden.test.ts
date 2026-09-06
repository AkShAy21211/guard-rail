import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseConstitution, extractProse } from "@guardrail/parser";
import { buildSyncOutputs } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesRoot = resolve(__dirname, "../../../examples");

/**
 * Golden-file tests: snapshot every generated file for each examples/*
 * fixture. If a template change alters output unexpectedly, one of these
 * snapshots fails — `vitest run -u` intentionally updates the golden files
 * when the change is deliberate.
 */
describe.each(["sample", "nextjs"])("buildSyncOutputs golden files: examples/%s", (fixture) => {
  const constitutionPath = resolve(examplesRoot, fixture, ".guardrail/constitution.md");
  const constitution = parseConstitution(constitutionPath);
  const prose = extractProse(constitutionPath);
  const outputs = buildSyncOutputs(constitution, prose);

  it(`produces the expected set of output files for ${fixture}`, () => {
    expect(outputs.map((o) => o.relativePath).sort()).toMatchSnapshot();
  });

  it(`produces the expected CLAUDE.md content for ${fixture}`, () => {
    const claudeMd = outputs.find((o) => o.relativePath === "CLAUDE.md");
    expect(claudeMd?.content).toMatchSnapshot();
  });

  it(`produces the expected AGENTS.md content for ${fixture}`, () => {
    const agentsMd = outputs.find((o) => o.relativePath === "AGENTS.md");
    expect(agentsMd?.content).toMatchSnapshot();
  });

  it(`produces the expected copilot-instructions.md content for ${fixture}`, () => {
    const copilot = outputs.find((o) => o.relativePath === ".github/copilot-instructions.md");
    expect(copilot?.content).toMatchSnapshot();
  });

  it(`produces the expected cursor rules for ${fixture}`, () => {
    const cursorFiles = outputs
      .filter((o) => o.relativePath.startsWith(".cursor/rules/"))
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    expect(cursorFiles).toMatchSnapshot();
  });
});
