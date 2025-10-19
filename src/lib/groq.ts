import type { RepoSnapshot } from "../shared/types";
import type { LLMResult } from "../shared/llmTypes";

export async function inferCommand(params: {
	utterance: string;
	repoSnapshot: RepoSnapshot;
	history: string[];
	learningMode: boolean;
}): Promise<LLMResult> {
	const { utterance, repoSnapshot, history, learningMode } = params;

	const apiKey = import.meta.env.VITE_GROQ_API_KEY;
	if (!apiKey) {
		throw new Error("VITE_GROQ_API_KEY is not configured");
	}

	// Build rich repository context string
	const stagedCount = repoSnapshot.stagedFiles?.length || 0;
	const unstagedCount = repoSnapshot.unstagedFiles?.length || 0;
	const untrackedCount = repoSnapshot.untrackedFiles?.length || 0;
	const dirtyStatus = repoSnapshot.dirty ? "yes" : "no";

	let upstreamInfo = "none";
	if (repoSnapshot.upstream) {
		upstreamInfo = repoSnapshot.upstream;
		if (repoSnapshot.aheadBehind) {
			upstreamInfo += ` (ahead ${repoSnapshot.aheadBehind.ahead}, behind ${repoSnapshot.aheadBehind.behind})`;
		}
	}

	// Build system message
	const systemMessage = `You are a Git command assistant. Your role is to:
1. Convert natural language into safe, non-destructive git commands
2. Only suggest single git commands (no chaining with && or ;)
3. Avoid destructive operations like force push, hard reset, or branch deletion unless explicitly requested
4. Ask for clarification if the user's intent is unclear or you need more information
5. Return responses in JSON format matching this schema:
   {
     "command": "git <command>",
     "explanation": "Brief explanation of what this command does",
     "reasoning_tags": ["optional", "array", "of", "reasoning"],
     "needs_clarification": false,
     "clarification_question": "Optional question if needs_clarification is true"
   }

Repository context:
- Current branch: ${
		repoSnapshot.currentBranch || repoSnapshot.branch || "unknown"
	}
- Upstream: ${upstreamInfo}
- Dirty working directory: ${dirtyStatus}
- Staged files: ${stagedCount}
- Unstaged files: ${unstagedCount}
- Untracked files: ${untrackedCount}
- Recent command history: ${
		history.length > 0 ? history.slice(-5).join(", ") : "none"
	}
- Learning mode: ${
		learningMode ? "enabled (user will confirm commands)" : "disabled"
	}

User utterance: "${utterance}"

Respond ONLY with valid JSON. If you're unsure about the user's intent, set needs_clarification to true and provide a clarification_question.`;

	const requestBody = {
		model: "llama-3.3-70b-versatile",
		messages: [
			{
				role: "system",
				content: systemMessage,
			},
			{
				role: "user",
				content: utterance,
			},
		],
		temperature: 0.2,
		response_format: { type: "json_object" },
	};

	let response: Response;
	try {
		response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(requestBody),
		});
	} catch (error) {
		throw new Error(
			`Network error calling Groq API: ${
				error instanceof Error ? error.message : String(error)
			}`
		);
	}

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(
			`Groq API returned status ${response.status}: ${errorText}`
		);
	}

	let responseData: any;
	try {
		responseData = await response.json();
	} catch (error) {
		throw new Error("Failed to parse Groq API response as JSON");
	}

	// Extract the assistant's message
	const assistantMessage = responseData?.choices?.[0]?.message?.content || "";
	if (!assistantMessage) {
		throw new Error("No content in Groq API response");
	}

	// Robust JSON extraction: try three formats
	let result: any;

	// 1. Try direct JSON parse
	try {
		result = JSON.parse(assistantMessage);
	} catch {
		// 2. Try extracting from fenced code block (```json ... ```)
		const fencedMatch = assistantMessage.match(
			/```(?:json)?\s*\n([\s\S]*?)\n```/
		);
		if (fencedMatch) {
			try {
				result = JSON.parse(fencedMatch[1]);
			} catch {
				// Continue to next method
			}
		}

		// 3. Try brace slice (find first { to last })
		if (!result) {
			const firstBrace = assistantMessage.indexOf("{");
			const lastBrace = assistantMessage.lastIndexOf("}");
			if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
				try {
					result = JSON.parse(
						assistantMessage.slice(firstBrace, lastBrace + 1)
					);
				} catch (error) {
					throw new Error(
						`Failed to extract valid JSON from response. Raw content: ${assistantMessage.slice(
							0,
							200
						)}...`
					);
				}
			} else {
				throw new Error(
					`No valid JSON found in response. Raw content: ${assistantMessage.slice(
						0,
						200
					)}...`
				);
			}
		}
	}

	// Validate required fields
	if (typeof result?.command !== "string") {
		throw new Error(
			`Missing or invalid 'command' field in LLM response. Got: ${JSON.stringify(
				result
			)}`
		);
	}

	if (typeof result?.needs_clarification !== "boolean") {
		throw new Error(
			`Missing or invalid 'needs_clarification' field in LLM response. Got: ${JSON.stringify(
				result
			)}`
		);
	}

	// Construct and return typed result
	const llmResult: LLMResult = {
		command: result.command,
		explanation: result.explanation || "",
		reasoning_tags: Array.isArray(result.reasoning_tags)
			? result.reasoning_tags
			: undefined,
		needs_clarification: result.needs_clarification,
		clarification_question:
			typeof result.clarification_question === "string"
				? result.clarification_question
				: undefined,
	};

	return llmResult;
}
