/**
 * @guardrail/core — shared types for the Guardrail constitution.
 *
 * Phase 1: minimal placeholder type so downstream packages can reference it.
 * Phase 2 replaces this with the full zod-validated schema.
 */
export interface Constitution {
  version: number;
  project: {
    name: string;
  };
  rules: unknown[];
}
