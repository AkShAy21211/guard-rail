// PLANTED VIOLATION: billing reaches directly into auth's internals instead
// of going through a shared package. Guardrail's no-cross-feature-imports
// rule should flag this line.
import { getCurrentUserId } from "../auth/session";

export function getInvoiceForCurrentUser(): string {
  return `invoice-for-${getCurrentUserId()}`;
}
