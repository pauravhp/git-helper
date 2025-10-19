// src/types/global.d.ts
export {};

declare global {
	interface Window {
		api: {
			execGit(
				args: string[],
				cwd?: string
			): Promise<{ code: number | null; output: string; err: string }>;
			onGitOutput(cb: (data: string) => void): () => void;
		};
	}
}
