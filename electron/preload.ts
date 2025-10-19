console.log("✅ Preload script loaded!");

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	execGit: (args: string[], cwd?: string) =>
		ipcRenderer.invoke("exec:git", args, cwd),

	onGitOutput: (cb: (data: string) => void) => {
		const handler = (_: any, data: string) => cb(data);
		ipcRenderer.on("git:output", handler);
		return () => ipcRenderer.removeListener("git:output", handler);
	},

	getRepoSnapshot: (cwd?: string) => ipcRenderer.invoke("git:snapshot", cwd),
});
