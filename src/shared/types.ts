export type AheadBehind = { ahead: number; behind: number } | null;

export interface RepoSnapshot {
  inRepo: boolean;             // true if inside a git work tree
  branch: string | null;       // current branch name or null (detached HEAD)
  upstream: string | null;     // e.g. origin/main
  aheadBehind: AheadBehind;    // {ahead, behind} if upstream exists, else null
  dirty: boolean;              // any uncommitted changes?
  dirtyFiles: string[];        // short list (≤20) of changed paths
  timestamp: string;           // ISO datetime when collected
}
