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

/**
 * Smoke test suite for LLM-powered voice command inference
 * Tests various natural language utterances that a user might speak
 */
export async function runLLMSmoke() {
	// Test scenarios simulating different voice command contexts
	const testScenarios = [
		{
			name: "Branch Creation",
			utterance:
				"I want to create a new branch called feature slash authentication",
			snapshot: {
				currentBranch: "main",
				stagedFiles: [],
				unstagedFiles: ["src/App.tsx", "README.md"],
				untrackedFiles: [],
			},
			history: ["git status", "git log --oneline"],
		},
		{
			name: "Stage Files",
			utterance: "add all my changes to the staging area",
			snapshot: {
				currentBranch: "feature/voice-commands",
				stagedFiles: [],
				unstagedFiles: ["src/components/TerminalView.tsx", "package.json"],
				untrackedFiles: ["src/lib/voiceProcessor.ts"],
			},
			history: ["git status"],
		},
		{
			name: "Commit with Message",
			utterance:
				"commit these changes with the message implement voice recognition",
			snapshot: {
				currentBranch: "feature/voice-commands",
				stagedFiles: ["src/components/TerminalView.tsx", "src/lib/groq.ts"],
				unstagedFiles: [],
				untrackedFiles: [],
			},
			history: ["git add .", "git status"],
		},
		{
			name: "View History",
			utterance: "show me the last five commits",
			snapshot: {
				currentBranch: "main",
				stagedFiles: [],
				unstagedFiles: [],
				untrackedFiles: [],
			},
			history: ["git status"],
		},
		{
			name: "Check Status",
			utterance: "what's the current status of my repository",
			snapshot: {
				currentBranch: "dev/experimental",
				stagedFiles: ["test.txt"],
				unstagedFiles: ["README.md"],
				untrackedFiles: ["notes.md"],
			},
			history: [],
		},
	];

	console.log("🧪 Running LLM Smoke Tests...\n");
	const results = [];

	for (const scenario of testScenarios) {
		console.log(`\n📝 Test: ${scenario.name}`);
		console.log(`🗣️  Utterance: "${scenario.utterance}"`);

		try {
			const result = await inferCommand({
				utterance: scenario.utterance,
				repoSnapshot: scenario.snapshot,
				history: scenario.history,
				learningMode: true,
			});

			console.log(`✅ Command: ${result.command}`);
			console.log(`💡 Explanation: ${result.explanation}`);
			console.log(`❓ Needs clarification: ${result.needs_clarification}`);

			if (result.clarification_question) {
				console.log(`🤔 Question: ${result.clarification_question}`);
			}

			results.push({
				scenario: scenario.name,
				success: true,
				result,
			});
		} catch (error) {
			console.error(
				`❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`
			);
			results.push({
				scenario: scenario.name,
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	console.log("\n\n📊 Test Summary:");
	console.log(`Total: ${results.length}`);
	console.log(`Passed: ${results.filter((r) => r.success).length}`);
	console.log(`Failed: ${results.filter((r) => !r.success).length}`);

	return results;
}

/**
 * Quick single-command test for rapid iteration
 * Usage in DevTools: import('/src/sandboxes/llmSmokeTest').then(m => m.runQuickTest())
 */
export async function runQuickTest(utterance?: string) {
	const testUtterance = utterance || "show me what files have changed";

	console.log(`🎤 Testing utterance: "${testUtterance}"`);

	try {
		const result = await inferCommand({
			utterance: testUtterance,
			repoSnapshot: {
				currentBranch: "main",
				stagedFiles: [],
				unstagedFiles: ["src/App.tsx"],
				untrackedFiles: ["temp.log"],
			},
			history: ["git status"],
			learningMode: true,
		});

		console.log("✅ LLM Result:", result);
		return result;
	} catch (error) {
		console.error("❌ Test failed:", error);
		throw error;
	}
}
