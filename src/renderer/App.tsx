import { IpcRendererEvent } from "electron";
import * as React from "react";
import { ContextMenuCommand, ShowContextMenu } from "../constants";
import { useIpcRenderer } from "./useIpcRenderer";

export const App = () => {
	const ipcRenderer = useIpcRenderer();
	const [folder, setFolder] = React.useState("");
	React.useEffect(() => {
		window.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			ipcRenderer.send(ShowContextMenu);
		});
	}, []);
	React.useEffect(() => {
		return ipcRenderer.on(ContextMenuCommand, (command : string) => {
			console.log(command);
		});
	}, []);
	const getRepository = React.useCallback(async () => {
		setFolder(await ipcRenderer.getRepository(folder));
	}, [folder]);
	return (
		<div>
			<button onClick={getRepository}>
				Git Repository: {folder}
			</button>
		</div>
	);
};