import type { Rule } from "@guardrail/core";

/**
 * `--semantic` is Guardrail's ONE opt-in, network-dependent code path. It is
 * never invoked unless the user explicitly passes `--semantic` on `guardrail
 * check`, and it never runs without ANTHROPIC_API_KEY set in the
 * environment. No other command, flag, or default behavior in Guardrail
 * makes a network call — see packages/rules-engine/test/no-network-calls.test.ts
 * for the enforced guarantee on the deterministic packages.
 */

export interface SemanticResult {
  ruleId: string;
  verdict: "PASS" | "FAIL" | "UNCERTAIN";
  rationale: string;
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-3-5-sonnet-latest";
const ANTHROPIC_VERSION = "2023-06-01";

type SemanticEnforcement = Extract<Rule["enforcement"], { type: "semantic" }>;

export async function evaluateSemanticRule(
  rule: Rule & { enforcement: SemanticEnforcement },
  diffText: string,
  apiKey: string
): Promise<SemanticResult> {
  const model = process.env.GUARDRAIL_SEMANTIC_MODEL ?? DEFAULT_MODEL;

  const prompt =
    `You are reviewing a code change against a single project rule.\n\n` +
    `Rule: ${rule.description}\n` +
    `Rule guidance: ${rule.enforcement.prompt}\n\n` +
    `Diff:\n${diffText || "(no diff content available)"}\n\n` +
    `Respond with exactly one word on the first line: PASS, FAIL, or UNCERTAIN. ` +
    `On the next line, give a one-sentence rationale.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic API request failed: ${response.status} ${response.statusText} ${body}`.trim());
  }

  const data = (await response.json()) as { content?: Array<{ text?: string }> };
  const text = data.content?.[0]?.text ?? "";
  const firstLine = text.trim().split("\n")[0]?.trim().toUpperCase() ?? "";

  let verdict: SemanticResult["verdict"] = "UNCERTAIN";
  if (firstLine.startsWith("PASS")) verdict = "PASS";
  else if (firstLine.startsWith("FAIL")) verdict = "FAIL";

  const rationale = text.trim().split("\n").slice(1).join(" ").trim() || text.trim() || "(no rationale returned)";

  return { ruleId: rule.id, verdict, rationale };
}
