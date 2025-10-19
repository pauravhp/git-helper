// electron/repoSnapshot.ts
import { execFile as _execFile } from "child_process";
import { promisify } from "util";
import type { RepoSnapshot, AheadBehind } from "../src/shared/types.ts";

const execFile = promisify(_execFile);

const GIT_ENV = {
  ...process.env,
  GIT_PAGER: "cat",
  LC_ALL: "C",
};

const EXEC_OPTS = {
  timeout: 2500, // ms — keep snappy
  env: GIT_ENV,
} as const;

async function git(args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFile("git", args, { ...EXEC_OPTS, cwd });
    return stdout.trim();
  } catch {
    // Treat failures as empty output so probes can be “graceful”
    return "";
  }
}

function parseDirtyFiles(statusOut: string): { dirty: boolean; files: string[] } {
  // git status --porcelain lines look like: "XY path" (2 status chars + space)
  const lines = statusOut
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const files = lines
    .map((l) => (l.length > 3 ? l.slice(3) : l)) // drop "XY "
    .map((p) => p.replace(/\s->\s.*$/, ""))      // collapse renames to "from" path
    .slice(0, 20);                                // cap to 20

  return { dirty: files.length > 0, files };
}

export async function getRepoSnapshot(cwd?: string): Promise<RepoSnapshot> {
  const timestamp = new Date().toISOString();

  // Probe: are we inside a work tree?
  const isWorkTree = (await git(["rev-parse", "--is-inside-work-tree"], cwd)) === "true";
  if (!isWorkTree) {
    return {
      inRepo: false,
      branch: null,
      upstream: null,
      aheadBehind: null,
      dirty: false,
      dirtyFiles: [],
      timestamp,
    };
  }

  // Current branch (or HEAD if detached)
  const abbrevRef = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const branch = !abbrevRef || abbrevRef === "HEAD" ? null : abbrevRef;

  // Dirty files
  const statusOut = await git(["status", "--porcelain"], cwd);
  const { dirty, files: dirtyFiles } = parseDirtyFiles(statusOut);

  // Upstream (may not exist)
  const upstream = await git(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    cwd
  );
  const upstreamVal = upstream || null;

  // Ahead/Behind (only if upstream exists)
  let aheadBehind: AheadBehind = null;
  if (upstreamVal) {
    const counts = await git(["rev-list", "--left-right", "--count", `${upstreamVal}...HEAD`], cwd);
    // Output like: "X\tY" where X = commits unique to upstream (behind), Y = commits unique to HEAD (ahead)
    const [left, right] = counts.split(/\s+/).map((n) => parseInt(n, 10));
    if (Number.isFinite(left) && Number.isFinite(right)) {
      aheadBehind = { ahead: right, behind: left };
    }
  }

  return {
    inRepo: true,
    branch,
    upstream: upstreamVal,
    aheadBehind,
    dirty,
    dirtyFiles,
    timestamp,
  };
}
