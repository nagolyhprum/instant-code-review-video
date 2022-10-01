import * as React from "react";
import { CanvasText, FileChange } from "../types";
import { ContextMenuCommand, ShowContextMenu } from "../constants";
import { useIpcRenderer } from "./useIpcRenderer";

const tokenRegexp = /(\s*)(\S+)/g;
const position = (input : string, context : CanvasRenderingContext2D) => {
	const height = parseFloat(context.font);
	const output : CanvasText[] = [];
	let match = tokenRegexp.exec(input), x = 0, y = 0;
	while(match) {		
		const [_, spaces, token] = match;
		spaces.split("").forEach(space => {
			const width = context.measureText(space).width;
			output.push({
				x,
				y,
				width,
				height,
				character : space,
				color : "transparent"
			});
			if(space === "\n") {
				x = 0;
				y += height;
			} else {
				x += width;
			}
		});
		token.split("").forEach(character => {
			const width = context.measureText(character).width;
			output.push({
				x,
				y,
				width,
				height,
				character,
				color : "black"
			});
			x += width;
		});
		match = tokenRegexp.exec(input);
	}
	return output;
};

export const App = () => {
	// custom hooks
	const ipcRenderer = useIpcRenderer();
	// state
	const [fileChanges, setFileChanges] = React.useState<FileChange[]>([]);
	const [branches, setBranches] = React.useState<string[]>([]);
	// settings
	const [folder, setFolder] = React.useState("");
	const [branch, setBranch] = React.useState("");
	const [fileChange, setFileChange] = React.useState("");
	// refs
	const canvas = React.useRef<HTMLCanvasElement>(null);
	// effects
	React.useEffect(() => {
		const callback = async () => {
			const branches = await ipcRenderer.getBranches(folder);
			setBranches(branches);
			setBranch(branches[0]);
		};
		callback();
	}, [folder]);
	React.useEffect(() => {
		const callback = async () => {
			const fileChanges = await ipcRenderer.getFileChanges(folder, branch);
			setFileChanges(fileChanges);
			setFileChange(fileChanges[0] ? fileChanges[0].path : "");
		};
		callback();
	}, [branch]);
	React.useEffect(() => {
		window.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			ipcRenderer.send(ShowContextMenu);
		});
	}, []);
	React.useEffect(() => {
		return ipcRenderer.on(ContextMenuCommand, (command : string) => {
			console.log(command);
		});
	}, []);
	React.useEffect(() => {
		const fileChangeItem = fileChanges.find(it => it.path === fileChange);
		const code = fileChangeItem ? `<<<<<<<<<<<<<<<<<<<<<<<<<<<< main
${fileChangeItem.original}
============================
${fileChangeItem.modified}
>>>>>>>>>>>>>>>>>>>>>>>>>>>> ${branch}` : "";
		const context = canvas.current.getContext("2d");
		context.font = "16px Courier New";
		const characters = position(code, context);
		if(characters.length) {
			const last = characters.at(-1);
			canvas.current.width = characters.reduce((max, character) => {
				return Math.max(max, character.x + character.width);
			}, 0);
			canvas.current.height = last.y + last.height;
			context.font = "16px Courier New";
			context.textAlign = "left";
			context.textBaseline = "top";
			characters.forEach(character => {
				context.fillStyle = character.color;
				context.fillText(character.character, character.x, character.y);
			});
		}
	}, [fileChange]);
	// callbacks
	const getRepository = React.useCallback(async () => {
		setFolder(await ipcRenderer.getRepository(folder));
	}, [folder]);
	return (
		<div style={{
			display : "flex",
			flexDirection : "column",
			alignItems : "start",
			justifyContent : "start"
		}}>
			<button onClick={getRepository}>
				Git Repository: {folder}
			</button>
			<select value={branch} onChange={event => setBranch(event.target.value)}>
				{branches.map(branch => (
					<option key={branch}>{branch}</option>
				))}
			</select>
			<select value={fileChange} onChange={event => setFileChange(event.target.value)}>
				{fileChanges.map(fileChange => (
					<option key={fileChange.path}>{fileChange.path}</option>
				))}
			</select>
			<canvas ref={canvas}></canvas>
		</div>
	);
};