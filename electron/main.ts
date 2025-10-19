import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;

function create() {
	win = new BrowserWindow({
		width: 1100,
		height: 700,
		backgroundColor: "#000",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	const url = process.env.VITE_DEV_SERVER_URL;
	if (url) win.loadURL(url);
	else win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(create);
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) create();
});
