import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import path from "path";
import Html from "./index.html";
import "./menu";
import MenuBuilder from "./menu";

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		title: "Instant Code Review Video",
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.js"),
		}
	});
	ipcMain.handle("dialog:openDirectory", async (_, path : string) => {
		const { filePaths } = await dialog.showOpenDialog(mainWindow, {
			properties: ["openDirectory"], 
			defaultPath: path,			
		});
		return filePaths[0] || path;
	});
	mainWindow.loadFile(path.join(__dirname, Html));
	mainWindow.webContents.openDevTools();
	return mainWindow;
};

app.whenReady().then(() => {
	const mb = new MenuBuilder(createWindow());
	mb.buildMenu();
	app.on("activate", () => {
		if(BrowserWindow.getAllWindows().length === 0) {
			const mb = new MenuBuilder(createWindow());
			mb.buildMenu();
		}
	});
});


app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

ipcMain.on("show-context-menu", (event) => {
	const template = [
		{
			label: "Menu Item 1",
			click: () => { event.sender.send("context-menu-command", "menu-item-1"); }
		},
		{ type: "separator" },
		{ label: "Menu Item 2", type: "checkbox", checked: true }
	];
	const menu = Menu.buildFromTemplate(template as any);
	menu.popup(BrowserWindow.fromWebContents(event.sender) as any);
});