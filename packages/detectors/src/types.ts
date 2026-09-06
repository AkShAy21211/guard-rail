export type Casing = "PascalCase" | "camelCase" | "kebab-case" | "snake_case" | "mixed/undetected";

export interface TypescriptFinding {
  present: boolean;
  declaredVersion: string | null;
}

export interface FrameworkFinding {
  frameworks: string[];
}

export type ArchitecturePattern = "feature-based" | "layered" | "mvc" | "unknown";

export interface FilesystemFinding {
  pattern: ArchitecturePattern;
  evidence: string[];
}

export interface FolderNamingFinding {
  folder: string;
  casing: Casing;
  confidence: number; // 0..1, share of sampled files matching `casing`
  sampleSize: number;
  extensions: string[];
}

export interface NamingFinding {
  byFolder: FolderNamingFinding[];
}

export interface DependenciesFinding {
  dependencies: string[];
  devDependencies: string[];
}

export interface DetectorFindings {
  typescript: TypescriptFinding;
  framework: FrameworkFinding;
  filesystem: FilesystemFinding;
  naming: NamingFinding;
  dependencies: DependenciesFinding;
}
