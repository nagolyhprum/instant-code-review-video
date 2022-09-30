import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import type { IpcRenderer, IpcRendererEvent } from "electron";

declare let ipcRenderer : IpcRenderer;

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);

window.addEventListener("contextmenu", (e) => {
	e.preventDefault();
	ipcRenderer.send("show-context-menu");
});

ipcRenderer.on("context-menu-command", (e : IpcRendererEvent, command : string) => {
	console.log(e, command);
});