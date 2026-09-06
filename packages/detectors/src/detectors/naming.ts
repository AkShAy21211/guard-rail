import { basename, extname } from "node:path";
import fg from "fast-glob";
import type { Casing, FolderNamingFinding, NamingFinding } from "../types.js";

const FOLDER_TYPES = [
  "components",
  "hooks",
  "services",
  "features",
  "pages",
  "utils",
  "lib",
  "controllers",
  "models",
  "routes",
];

const CONFIDENCE_THRESHOLD = 0.8;

function classifyCasing(name: string): Casing | "other" {
  if (name.includes("-")) return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) ? "kebab-case" : "other";
  if (name.includes("_")) return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(name) ? "snake_case" : "other";
  if (/^[A-Z][A-Za-z0-9]*$/.test(name)) return "PascalCase";
  if (/^[a-z][A-Za-z0-9]*$/.test(name)) return "camelCase";
  return "other";
}

/**
 * For each known folder type present in the repo, samples the filenames
 * inside it (across all matching folders) and infers a dominant casing
 * convention by majority vote. Below the confidence threshold, the folder
 * is marked "mixed/undetected" rather than guessing.
 */
export function detectNaming(repoPath: string): NamingFinding {
  const byFolder: FolderNamingFinding[] = [];

  for (const folder of FOLDER_TYPES) {
    const files = fg.sync(`**/${folder}/*.{ts,tsx,js,jsx}`, {
      cwd: repoPath,
      onlyFiles: true,
      dot: false,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });
    if (files.length === 0) continue;

    const extensions = [...new Set(files.map((f) => extname(f).slice(1)))];
    const counts = new Map<Casing | "other", number>();
    for (const file of files) {
      const name = basename(file, extname(file));
      // skip barrel/index files — they carry no naming-convention signal
      if (name === "index") continue;
      const casing = classifyCasing(name);
      counts.set(casing, (counts.get(casing) ?? 0) + 1);
    }

    const sampleSize = [...counts.values()].reduce((a, b) => a + b, 0);
    if (sampleSize === 0) continue;

    let dominant: Casing | "other" = "other";
    let dominantCount = 0;
    for (const [casing, count] of counts) {
      if (count > dominantCount) {
        dominant = casing;
        dominantCount = count;
      }
    }
    const confidence = dominantCount / sampleSize;

    byFolder.push({
      folder,
      casing: confidence >= CONFIDENCE_THRESHOLD && dominant !== "other" ? dominant : "mixed/undetected",
      confidence,
      sampleSize,
      extensions,
    });
  }

  return { byFolder };
}
