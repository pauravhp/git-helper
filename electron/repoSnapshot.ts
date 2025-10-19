import { execFile } from "child_process";
import { promisify } from "util";
import type { RepoSnapshot } from "../src/shared/types.js";

const execFileAsync = promisify(execFile);

/**
 * Default timeout for git commands (2 seconds)
 */
const DEFAULT_TIMEOUT = 2000;

/**
 * Maximum number of dirty files to return
 */
const MAX_DIRTY_FILES = 20;

/**
 * Execute a git command with graceful error handling
 */
async function execGit(
	args: string[],
	cwd: string,
	timeoutMs = DEFAULT_TIMEOUT
): Promise<string | null> {
	try {
		const { stdout } = await execFileAsync("git", args, {
			cwd,
			timeout: timeoutMs,
			env: { ...process.env, GIT_PAGER: "cat" },
		});
		return stdout.trim();
	} catch (error) {
		// Gracefully handle errors - return null for any failure
		return null;
	}
}

/**
 * Get a snapshot of the current repository state.
 * All git probes are fault-tolerant and return sensible defaults on failure.
 *
 * @param cwd - Working directory to check (defaults to process.cwd())
 * @returns Promise<RepoSnapshot> with all repository information
 */
export async function getRepoSnapshot(
	cwd: string = process.cwd()
): Promise<RepoSnapshot> {
	const timestamp = new Date().toISOString();

	// Probe 1: Check if inside a git repository
	const isInsideWorkTree = await execGit(
		["rev-parse", "--is-inside-work-tree"],
		cwd
	);
	const inRepo = isInsideWorkTree === "true";

	// If not in a repo, return early with defaults
	if (!inRepo) {
		return {
			currentBranch: null,
			stagedFiles: [],
			unstagedFiles: [],
			untrackedFiles: [],
			inRepo: false,
			branch: null,
			upstream: null,
			aheadBehind: null,
			dirty: false,
			dirtyFiles: [],
			timestamp,
		};
	}

	// Probe 2: Get current branch (nullable for detached HEAD)
	const branchName = await execGit(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
	const branch = branchName && branchName !== "HEAD" ? branchName : null;

	// Probe 3: Get status for dirty state and files
	const statusOutput = await execGit(["status", "--porcelain"], cwd);
	const statusLines = statusOutput
		? statusOutput.split("\n").filter(Boolean)
		: [];

	const stagedFiles: string[] = [];
	const unstagedFiles: string[] = [];
	const untrackedFiles: string[] = [];
	const allDirtyFiles: string[] = [];

	for (const line of statusLines) {
		if (line.length < 4) continue;

		const x = line[0]; // Index status
		const y = line[1]; // Working tree status
		const fileName = line.substring(3);

		allDirtyFiles.push(fileName);

		// Categorize by status codes
		if (x !== " " && x !== "?") {
			stagedFiles.push(fileName);
		}
		if (y !== " " && y !== "?") {
			unstagedFiles.push(fileName);
		}
		if (x === "?" && y === "?") {
			untrackedFiles.push(fileName);
		}
	}

	const dirty = allDirtyFiles.length > 0;
	const dirtyFiles = allDirtyFiles.slice(0, MAX_DIRTY_FILES);

	// Probe 4: Get upstream branch
	const upstreamBranch = await execGit(
		["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
		cwd
	);
	const upstream = upstreamBranch || null;

	// Probe 5: Get ahead/behind count (only if upstream exists)
	let aheadBehind: { ahead: number; behind: number } | null = null;
	if (upstream) {
		const revListOutput = await execGit(
			["rev-list", "--left-right", "--count", "@{u}...HEAD"],
			cwd
		);
		if (revListOutput) {
			const parts = revListOutput.split(/\s+/);
			if (parts.length >= 2) {
				const behind = parseInt(parts[0], 10);
				const ahead = parseInt(parts[1], 10);
				if (!isNaN(behind) && !isNaN(ahead)) {
					aheadBehind = { ahead, behind };
				}
			}
		}
	}

	return {
		currentBranch: branch,
		stagedFiles,
		unstagedFiles,
		untrackedFiles,
		inRepo,
		branch,
		upstream,
		aheadBehind,
		dirty,
		dirtyFiles,
		timestamp,
	};
}
