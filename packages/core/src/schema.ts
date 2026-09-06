import { z } from "zod";

/**
 * The zod schema for a Guardrail constitution. This is the single source of
 * truth for what a valid `.guardrail/constitution.md` can contain — the
 * parser (packages/parser) validates against this, and every enforcement
 * checker (packages/rules-engine) is typed against the resulting shape.
 */

export const SeveritySchema = z.enum(["error", "warning", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

const ImportBoundaryEnforcement = z.object({
  type: z.literal("import-boundary"),
  deny: z.array(z.string()),
});

const SecretScanEnforcement = z.object({
  type: z.literal("secret-scan"),
});

const ForbiddenDependencyEnforcement = z.object({
  type: z.literal("forbidden-dependency"),
  deny: z.array(z.string()),
});

const NamingEnforcement = z.object({
  type: z.literal("naming"),
  pattern: z.string(),
});

const FilePlacementEnforcement = z.object({
  type: z.literal("file-placement"),
  allowedPaths: z.array(z.string()),
});

const SemanticEnforcement = z.object({
  type: z.literal("semantic"),
  prompt: z.string(),
});

export const EnforcementSchema = z.discriminatedUnion("type", [
  ImportBoundaryEnforcement,
  SecretScanEnforcement,
  ForbiddenDependencyEnforcement,
  NamingEnforcement,
  FilePlacementEnforcement,
  SemanticEnforcement,
]);
export type Enforcement = z.infer<typeof EnforcementSchema>;

export type ImportBoundaryEnforcement = z.infer<typeof ImportBoundaryEnforcement>;
export type SecretScanEnforcement = z.infer<typeof SecretScanEnforcement>;
export type ForbiddenDependencyEnforcement = z.infer<typeof ForbiddenDependencyEnforcement>;
export type NamingEnforcement = z.infer<typeof NamingEnforcement>;
export type FilePlacementEnforcement = z.infer<typeof FilePlacementEnforcement>;
export type SemanticEnforcement = z.infer<typeof SemanticEnforcement>;

export const RuleSchema = z.object({
  id: z.string().min(1, "rule id must not be empty"),
  description: z.string().min(1, "rule description must not be empty"),
  severity: SeveritySchema,
  scope: z.array(z.string()).min(1, "scope must list at least one glob"),
  enforcement: EnforcementSchema,
});
export type Rule = z.infer<typeof RuleSchema>;

/**
 * A snapshot of what `guardrail init` detected about the project's stack at
 * the time the constitution was drafted (or last refreshed). `guardrail
 * drift` (Phase 6) re-detects the current stack and compares it against
 * this snapshot — it's what lets drift answer "what did this project used
 * to look like?" without guessing. Entirely optional: a hand-written
 * constitution, or one from before Phase 6, simply has no drift baseline
 * to compare against.
 */
export const DeclaredStackSchema = z.object({
  frameworks: z.array(z.string()).default([]),
  architecturePattern: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
});
export type DeclaredStack = z.infer<typeof DeclaredStackSchema>;

export const ConstitutionSchema = z.object({
  version: z.number().int().positive().default(1),
  project: z.object({
    name: z.string().min(1, "project.name must not be empty"),
  }),
  rules: z.array(RuleSchema).default([]),
  declaredStack: DeclaredStackSchema.optional(),
});
export type Constitution = z.infer<typeof ConstitutionSchema>;
