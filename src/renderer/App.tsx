import { IpcRendererEvent } from "electron";
import * as React from "react";
import { useIpcRenderer } from "./useIpcRenderer";

export const App = () => {
	const ipcRenderer = useIpcRenderer();
	const [folder, setFolder] = React.useState("");
	React.useEffect(() => {
		window.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			ipcRenderer.send("show-context-menu");
		});
	}, []);
	React.useEffect(() => {
		return ipcRenderer.on("context-menu-command", (e : IpcRendererEvent, command : string) => {
			console.log(e, command);
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