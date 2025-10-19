import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";

export default defineConfig({
	plugins: [
		react(),
		electron({
			main: { entry: "electron/main.ts" },
			preload: { input: { preload: "electron/preload.ts" } },
		} as any),
		renderer(),
	],
	server: { port: 5173 },
});
