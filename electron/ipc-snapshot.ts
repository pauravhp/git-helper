import { ipcMain } from "electron";
import { getRepoSnapshot } from "./repoSnapshot.js";

/**
 * Register IPC handler for git repository snapshots.
 * Call this function once during app initialization.
 * Safe to call multiple times - handlers are idempotent.
 */

// Track if handler has been registered
let handlerRegistered = false;

export function registerSnapshotHandler() {
	if (handlerRegistered) {
		return;
	}

	ipcMain.handle("git:snapshot", async (_evt, cwd?: string) => {
		console.log("🔍 git:snapshot handler called with cwd:", cwd);
		return getRepoSnapshot(cwd);
	});

	handlerRegistered = true;
	console.log("✅ git:snapshot IPC handler registered");
}

// Auto-register on import (for compatibility)
registerSnapshotHandler();
