import { IpcRenderer } from "electron";
import * as React from "react";
import { FileChange, MainChannels, RendererChannels } from "../types";
import { GetBranches, GetFileChanges, OpenDirectory } from "../constants";

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
	const getRepository = (folder : string) : Promise<string> => invoke(OpenDirectory, folder);
	const getBranches = (folder : string) : Promise<string[]> => invoke(GetBranches, folder);
	const getFileChanges = (folder : string, branch : string) : Promise<FileChange[]> => invoke(GetFileChanges, folder, branch);
	return {
		send,
		on,
		invoke,
		getRepository,
		getBranches,
		getFileChanges
	};
};