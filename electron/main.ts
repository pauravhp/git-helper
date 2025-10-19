import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import path from "path";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;

function createWindow() {
	const isDev = !!process.env.VITE_DEV_SERVER_URL;

	// In dev, Vite serves the renderer and vite-plugin-electron builds to dist-electron/
	const preloadPath = isDev
		? path.join(app.getAppPath(), "dist-electron", "preload.js")
		: path.join(__dirname, "preload.js");

	console.log("Using preload:", preloadPath);

	win = new BrowserWindow({
		width: 1100,
		height: 700,
		backgroundColor: "#000000",
		webPreferences: {
			preload: preloadPath,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	const devUrl = process.env.VITE_DEV_SERVER_URL;
	if (isDev && devUrl) {
		win.loadURL(devUrl);
	} else {
		win.loadFile(path.join(__dirname, "../dist/index.html"));
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
