import { ContextMenuCommand, GetBranches, GetFileChanges, OpenDirectory, ShowContextMenu } from "./constants";

export type MainChannels = typeof OpenDirectory | typeof ShowContextMenu | typeof GetBranches | typeof GetFileChanges;
export type RendererChannels = typeof ContextMenuCommand;

export interface FileChange {
    path : string
    original : string
    modified : string;
}

export interface CanvasText {
	x : number
	y : number
	width : number
	height : number
	character : string
	color : string
}