import { contextBridge } from "electron";
contextBridge.exposeInMainWorld("api", {}); // empty for now; stays secure
