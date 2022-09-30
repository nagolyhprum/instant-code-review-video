import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);

window.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	// ipcRenderer.invoke("show-context-menu");
});

// ipcRenderer.on("context-menu-command", (e : IpcRendererEvent, command : string) => {
// 	console.log(e, command);
// });