import { app, BrowserWindow, ipcMain, session } from "electron";
import { fileURLToPath } from "url";
import path from "path";
import { spawn } from "child_process";
import { registerSnapshotHandler } from "./ipc-snapshot.js";

// Register IPC handlers
registerSnapshotHandler();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;

function createWindow() {
	const isDev = process.env.NODE_ENV === "development";
	const vitePort = 5123; // Match the port from Vite output

	// In dev, Vite serves the renderer and vite-plugin-electron builds to dist-electron/
	const preloadPath = isDev
		? path.join(app.getAppPath(), "dist-electron", "preload.cjs")
		: path.join(__dirname, "preload.cjs");

	console.log("Using preload:", preloadPath);
	console.log("Development mode:", isDev);

	win = new BrowserWindow({
		width: 1100,
		height: 700,
		backgroundColor: "#000000",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false, // Disable sandbox for speech recognition to work
		},
	});

	// Handle permissions for microphone access
	session.defaultSession.setPermissionRequestHandler(
		(webContents, permission, callback) => {
			console.log("Permission requested:", permission);
			if (permission === "media") {
				// Always grant media permission for speech recognition
				callback(true);
			} else {
				callback(false);
			}
		}
	);

	if (isDev) {
		const devUrl = `http://localhost:${vitePort}`;
		console.log("Loading from Vite dev server:", devUrl);
		win.loadURL(devUrl);
		win.webContents.openDevTools(); // Auto-open DevTools in dev mode
	} else {
		win.loadFile(path.join(__dirname, "../dist-react/index.html"));
	}
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// -------- Git exec (no native deps) --------
ipcMain.handle("exec:git", async (_evt, args: string[], cwd?: string) => {
	console.log("Running git command:", args);
	return new Promise<{ code: number | null; output: string; err: string }>(
		(resolve) => {
			const child = spawn("git", args, {
				cwd: cwd || process.cwd(),
				env: { ...process.env, GIT_PAGER: "cat" }, // no pager
			});

			let output = "";
			let err = "";

			child.stdout.on("data", (d) => {
				const t = d.toString();
				output += t;
				win?.webContents.send("git:output", t);
			});
			child.stderr.on("data", (d) => {
				const t = d.toString();
				err += t;
				win?.webContents.send("git:output", t);
			});
			child.on("close", (code) => {
				console.log("Git exited with", code);
				resolve({ code, output, err });
			});
		}
	);
});
