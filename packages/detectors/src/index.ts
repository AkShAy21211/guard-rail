import { detectTypescript } from "./detectors/typescript.js";
import { detectFramework } from "./detectors/framework.js";
import { detectFilesystem } from "./detectors/filesystem.js";
import { detectNaming } from "./detectors/naming.js";
import { detectDependencies } from "./detectors/dependencies.js";
import type { DetectorFindings } from "./types.js";

export { detectTypescript } from "./detectors/typescript.js";
export { detectFramework } from "./detectors/framework.js";
export { detectFilesystem } from "./detectors/filesystem.js";
export { detectNaming } from "./detectors/naming.js";
export { detectDependencies } from "./detectors/dependencies.js";
export type {
  Casing,
  TypescriptFinding,
  FrameworkFinding,
  ArchitecturePattern,
  FilesystemFinding,
  FolderNamingFinding,
  NamingFinding,
  DependenciesFinding,
  DetectorFindings,
} from "./types.js";

/** Runs every detector against a repo path and returns the combined findings. Zero network calls. */
export function runAllDetectors(repoPath: string): DetectorFindings {
  return {
    typescript: detectTypescript(repoPath),
    framework: detectFramework(repoPath),
    filesystem: detectFilesystem(repoPath),
    naming: detectNaming(repoPath),
    dependencies: detectDependencies(repoPath),
  };
}
