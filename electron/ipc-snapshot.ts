// electron/ipc-snapshot.ts
import { ipcMain } from "electron";
import { getRepoSnapshot } from "./repoSnapshot.js";



console.log("[ipc-snapshot] registering git:snapshot");
ipcMain.handle("git:snapshot", async (_evt, cwd?: string) => getRepoSnapshot(cwd));

//ipcMain.handle("git:snapshot", async (_evt, cwd?: string) => {
 // return await getRepoSnapshot(cwd);
//});
