import { ContextMenuCommand, GetBranches, OpenDirectory, ShowContextMenu } from "./constants";

export type MainChannels = typeof OpenDirectory | typeof ShowContextMenu | typeof GetBranches;
export type RendererChannels = typeof ContextMenuCommand;