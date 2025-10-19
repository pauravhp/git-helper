export interface LLMResult {
	command: string;
	explanation: string;
	reasoning_tags?: string[];
	needs_clarification: boolean;
	clarification_question?: string;
}
