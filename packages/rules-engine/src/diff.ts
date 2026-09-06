import { simpleGit } from "simple-git";

/**
 * Returns the set of repo-relative file paths changed vs. `baseBranch`
 * (working tree + staged + committed diff), for `guardrail check --diff`.
 */
export async function getChangedFiles(repoPath: string, baseBranch: string): Promise<Set<string>> {
  const git = simpleGit(repoPath);
  const diffArgs = [`${baseBranch}...HEAD`, "--name-only"];
  let committed = "";
  try {
    committed = await git.diff(diffArgs);
  } catch {
    // base branch may not exist locally (e.g. shallow clone) — fall back to working tree only
    committed = "";
  }
  const workingTree = await git.diff(["--name-only"]);
  const staged = await git.diff(["--name-only", "--cached"]);
  const status = await git.status();

  const files = new Set<string>();
  for (const block of [committed, workingTree, staged]) {
    for (const line of block.split("\n")) {
      const trimmed = line.trim();
      if (trimmed) files.add(trimmed);
    }
  }
  for (const f of status.not_added) files.add(f);

  return files;
}

/**
 * Returns the full unified diff text vs. `baseBranch` (committed + working
 * tree + staged), for `guardrail check --semantic` to hand to the LLM.
 */
export async function getDiffText(repoPath: string, baseBranch: string): Promise<string> {
  const git = simpleGit(repoPath);
  let committed = "";
  try {
    committed = await git.diff([`${baseBranch}...HEAD`]);
  } catch {
    committed = "";
  }
  const workingTree = await git.diff([]);
  const staged = await git.diff(["--cached"]);
  return [committed, workingTree, staged].filter((s) => s.trim().length > 0).join("\n");
}
