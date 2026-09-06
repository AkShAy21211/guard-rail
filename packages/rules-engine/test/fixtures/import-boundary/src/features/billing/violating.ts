import { getCurrentUserId } from "../auth/session";

export function invoiceOwner(): string {
  return getCurrentUserId();
}
