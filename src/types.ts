import { ContextMenuCommand, OpenDirectory, ShowContextMenu } from "./constants";

export type MainChannels = typeof OpenDirectory | typeof ShowContextMenu;
export type RendererChannels = typeof ContextMenuCommand;