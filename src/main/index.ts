import { app, BrowserWindow, Menu, ipcMain, dialog } from "electron";
import path from "path";
import { ContextMenuCommand, GetBranches, GetFileChanges, OpenDirectory, ShowContextMenu } from "../constants";
import Html from "./index.html";
import "./menu";
import MenuBuilder from "./menu";
import child_process from "child_process";
import { FileChange } from "../types";

const git = (folder : string, ...commands : string[]) => new Promise<string>((resolve, reject) => {
	child_process.exec(`git ${commands.join(" ")}`, {
		cwd : folder,
	}, (error, stdout) => {
		if(error) reject(error);
		else resolve(stdout);
	});
});

const show = async (folder : string, branch : string, path : string) => {
	try {
		return await git(folder, "show", `${branch}:${path}`);
	} catch(e) {
		return "";
	}
};

const getFileChanges = async (folder : string, branch : string) : Promise<FileChange[]> => {
	if(folder && branch) {
		try {
			const main = await getMainBranch(folder);
			const diff = await git(folder, "diff", `${main}..${branch} --name-only`);
			return await Promise.all(diff.split(/\s+/).filter(_ => _).map(async path => {
				const original = await show(folder, main, path);
				const modified = await show(folder, branch, path);
				return {
					path,
					original,
					modified
				};
			}));
		} catch(e) {
			// DO NOTHING
		}
	}
	return [];
};

const getMainBranch = async (folder : string) : Promise<string> => {
	const result = await git(folder, "rev-parse", "--abbrev-ref", "origin/HEAD");
	return result.split("/").at(-1).trim();
};

const removeStarRegexp = /^\*/;
const getBranches = async (folder : string) : Promise<string[]> => {
	if(folder) {
		try {
			const main = await getMainBranch(folder);
			const result = await git(folder, "branch");
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
	ipcMain.handle(OpenDirectory, async (_, folder : string) => {
		const { filePaths } = await dialog.showOpenDialog(mainWindow, {
			properties: ["openDirectory"], 
			defaultPath: folder,			
		});
		return filePaths[0] || folder;
	});
	ipcMain.handle(GetBranches, async (_, folder : string) => {		
		return getBranches(folder);
	});
	ipcMain.handle(GetFileChanges, async (_, folder : string, branch : string) => {		
		return getFileChanges(folder, branch);
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