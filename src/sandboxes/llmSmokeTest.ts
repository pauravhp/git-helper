import { inferCommand } from "../lib/groq";

// Local fallback type for testing - matches the required snapshot structure
// This allows the test to run independently without requiring Dev A's files
interface TestRepoSnapshot {
	inRepo: boolean;
	branch: string | null;
	upstream: string | null;
	aheadBehind: { ahead: number; behind: number } | null;
	dirty: boolean;
	dirtyFiles: string[];
	timestamp: string;
}

export async function runLLMSmoke() {
	// Build a fake snapshot for testing
	const fakeSnapshot: TestRepoSnapshot = {
		inRepo: true,
		branch: "main",
		upstream: null,
		aheadBehind: null,
		dirty: true,
		dirtyFiles: ["README.md"],
		timestamp: new Date().toISOString(),
	};

	// Note: inferCommand expects RepoSnapshot with currentBranch, stagedFiles, etc.
	// We'll adapt our test snapshot to match the actual interface
	const adaptedSnapshot = {
		currentBranch: fakeSnapshot.branch,
		stagedFiles: [],
		unstagedFiles: fakeSnapshot.dirtyFiles,
		untrackedFiles: [],
	};

	try {
		const result = await inferCommand({
			utterance: "create a new branch called feature/login",
			repoSnapshot: adaptedSnapshot,
			history: ["git status"],
			learningMode: true,
		});

		console.log("LLM result:", result);
		return result;
	} catch (error) {
		if (error instanceof Error) {
			console.error("LLM smoke test failed:", error.message);
			throw error;
		}
		throw new Error("Unknown error during LLM smoke test");
	}
}
