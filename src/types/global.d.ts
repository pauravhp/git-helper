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
			getRepoSnapshot(
				cwd?: string
			): Promise<import("../shared/types").RepoSnapshot>;
		};
		webkitSpeechRecognition: typeof SpeechRecognition;
		SpeechRecognition: typeof SpeechRecognition;
	}

	interface ImportMetaEnv {
		readonly VITE_GROQ_API_KEY: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}
