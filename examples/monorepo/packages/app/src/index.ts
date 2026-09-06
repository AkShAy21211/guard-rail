// PLANTED VIOLATION: reaches directly into shared-utils' internal folder
// instead of importing its public entrypoint (../shared-utils/src/index.ts).
import { slugify } from "../../shared-utils/src/internal/helpers";

export function makeSlug(title: string): string {
  return slugify(title);
}
