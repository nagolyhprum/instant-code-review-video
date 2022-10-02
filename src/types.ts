import { ContextMenuCommand, GetBranches, GetFileChanges, OpenDirectory, ShowContextMenu } from "./constants";

export type MainChannels = typeof OpenDirectory | typeof ShowContextMenu | typeof GetBranches | typeof GetFileChanges;
export type RendererChannels = typeof ContextMenuCommand;

export interface FileChange {
    path : string
    original : string
    modified : string;
	current : string
}

export interface CanvasText {
	padding : number
	x : number
	y : number
	width : number
	height : number
	character : string
	color : string
	background : string
}

export interface TextNode {
	text : string
	diffs : number
	previous?: TextNode
	status : "added" | "removed" | "same"
}