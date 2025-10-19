/**
 * Represents a snapshot of the current repository state.
 * Used by the LLM to understand git context when inferring commands.
 */
export interface RepoSnapshot {
	// Existing fields - DO NOT REMOVE (used by LLM demo)
	currentBranch: string | null;
	stagedFiles: string[];
	unstagedFiles: string[];
	untrackedFiles: string[];

	// Extended fields for richer context (optional for backward compatibility)

	/** Whether the current directory is inside a git repository */
	inRepo?: boolean;

	/** Current branch name, same as currentBranch (for compatibility) */
	branch?: string | null;

	/** Upstream tracking branch, e.g. "origin/main" */
	upstream?: string | null;

	/** How many commits ahead/behind the upstream branch */
	aheadBehind?: { ahead: number; behind: number } | null;

	/** Whether there are any uncommitted changes (staged, unstaged, or untracked) */
	dirty?: boolean;

	/** List of files with changes (staged + unstaged + untracked, capped at 20) */
	dirtyFiles?: string[];

	/** ISO 8601 timestamp when this snapshot was captured */
	timestamp?: string;
}
