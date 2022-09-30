import type { IpcRenderer, IpcRendererEvent } from "electron";
import * as React from "react";
import { MainChannels, RendererChannels } from "../types";

declare let ipcRenderer : IpcRenderer;
declare let versions : {
    chrome : string
    node : string
    electron : string
};

console.log(versions);

export const useIpcRenderer = () => {
	const send = React.useCallback((name : MainChannels, ...args : unknown[]) => { // connects to `on`
		ipcRenderer.send(name, args);
	}, []);
	const on = React.useCallback((channel : RendererChannels, listener : (...args : unknown[]) => void) => {
		return ipcRenderer.on(channel, listener) as unknown as () => void;
	}, []);
	const invoke = React.useCallback((name : MainChannels, ...args : unknown[]) => { // connects to `handle`
		return ipcRenderer.invoke(name, args);
	}, []);
	const getRepository = (folder : string) => invoke("dialog:openDirectory", folder);
	return {
		send,
		on,
		invoke,
		getRepository
	};
};