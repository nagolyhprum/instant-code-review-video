import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import path from "path";
import { ContextMenuCommand, GetBranches, OpenDirectory, ShowContextMenu } from "../constants";
import Html from "./index.html";
import "./menu";
import MenuBuilder from "./menu";
import child_process from "child_process";

const git = (path : string, ...commands : string[]) => {
	return new Promise<string>((resolve, reject) => child_process.exec(`git ${commands.join(" ")}`, {
		cwd : path,
	}, (error, stdout) => {
		if(error) reject(error);
		else resolve(stdout);
	}));
};

const getMainBranch = async (path : string) : Promise<string> => {
	const result = await git(path, "rev-parse", "--abbrev-ref", "origin/HEAD");
	return result.split("/").at(-1).trim();
};

const removeStarRegexp = /^\*/;
const getBranches = async (path : string) : Promise<string[]> => {
	if(path) {
		try {
			const main = await getMainBranch(path);
			console.log(main);
			const result = await git(path, "branch");
			return result.split(/\s+/).filter(_ => _ !== main && _.replace(removeStarRegexp, ""));
		} catch(e) {
			// DO NOTHING
		}
	}
	return [];
};

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1200,
		height: 800,
		title: "Instant Code Review Video",
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.js"),
		}
	});
	ipcMain.handle(OpenDirectory, async (_, path : string) => {
		const { filePaths } = await dialog.showOpenDialog(mainWindow, {
			properties: ["openDirectory"], 
			defaultPath: path,			
		});
		return filePaths[0] || path;
	});
	ipcMain.handle(GetBranches, async (_, path : string) => {		
		return getBranches(path);
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

ipcMain.on(ShowContextMenu, (event) => {
	const template = [
		{
			label: "Menu Item 1",
			click: () => { event.sender.send(ContextMenuCommand, "menu-item-1"); }
		},
		{ type: "separator" },
		{ label: "Menu Item 2", type: "checkbox", checked: true }
	];
	const menu = Menu.buildFromTemplate(template as any);
	menu.popup(BrowserWindow.fromWebContents(event.sender) as any);
});