import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { RendererChannels, MainChannels } from "../types";

contextBridge.exposeInMainWorld("versions", {
	node: process.versions.node,
	chrome: process.versions.chrome,
	electron: process.versions.electron,
});

contextBridge.exposeInMainWorld("ipcRenderer", {
	invoke(channel: MainChannels, args: unknown[]) {
		return ipcRenderer.invoke(channel, ...args);
	},
	send(channel: MainChannels, args: unknown[]) {
		ipcRenderer.send(channel, ...args);
	},
	on(channel: RendererChannels, func: (...args: unknown[]) => void) {
		const subscription = (_: IpcRendererEvent, ...args: unknown[]) => func(...args);
		ipcRenderer.on(channel, subscription);
		return () => ipcRenderer.removeListener(channel, subscription);
	},
});
