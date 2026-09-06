/**
 * @guardrail/core — shared schema and types for the Guardrail constitution.
 */
export {
  ConstitutionSchema,
  RuleSchema,
  EnforcementSchema,
  SeveritySchema,
  DeclaredStackSchema,
} from "./schema.js";
export type {
  Constitution,
  Rule,
  Enforcement,
  Severity,
  ImportBoundaryEnforcement,
  SecretScanEnforcement,
  ForbiddenDependencyEnforcement,
  NamingEnforcement,
  FilePlacementEnforcement,
  SemanticEnforcement,
  DeclaredStack,
} from "./schema.js";
import type { Severity } from "./schema.js";

/** A single check result produced by the rules engine (Phase 3). */
export interface Violation {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number | null;
  message: string;
}
