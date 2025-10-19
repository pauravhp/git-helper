// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import electron from "vite-plugin-electron";

// export default defineConfig({
// 	plugins: [
// 		react(),
// 		electron({
// 			// Build and auto-start Electron main process in dev
// 			main: {
// 				entry: "electron/main.ts",
// 				vite: { build: { outDir: "dist-electron" } },
// 				onstart(options: { startup: () => void }) {
// 					// Launch Electron after the first build, and restart on changes
// 					options.startup();
// 				},
// 			},
// 			// Build and auto-reload the preload in dev
// 			preload: {
// 				input: { preload: "electron/preload.ts" },
// 				vite: { build: { outDir: "dist-electron" } },
// 				onstart(options: { reload: () => void }) {
// 					// Reload renderer when preload is rebuilt
// 					options.reload();
// 				},
// 			},
// 		} as any),
// 	],
// 	// Renderer output (for production build)
// 	build: {
// 		outDir: "dist",
// 	},
// });
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	base: "./",
	build: {
		outDir: "dist-react",
	},
	server: {
		port: 5123,
		strictPort: true,
	},
});
