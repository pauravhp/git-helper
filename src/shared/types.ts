export interface RepoSnapshot {
	currentBranch: string | null;
	stagedFiles: string[];
	unstagedFiles: string[];
	untrackedFiles: string[];
}
