import * as React from "react";
import { CanvasText, FileChange } from "../types";
import { ContextMenuCommand, ShowContextMenu } from "../constants";
import { useIpcRenderer } from "./useIpcRenderer";

interface TextNode {
	text : string
	diffs : number
	previous?: TextNode
	status : "added" | "removed" | "same"
}

const highlight = (characters : CanvasText[], {
	start,
	end
} : {
	start : number
	end : number
}) => {
	characters.slice(start, end).forEach(character => {
		character.background = "rgba(0, 0, 0, .3)";
	});
};

const diffChars = (oldString : string, newString : string) => {
	const oldLines = oldString.split("\n"), newLines = newString.split("\n");
	const path : Array<Array<TextNode>> = [];
	const getValue = (i : number, j : number) => i >= 0 && i < oldLines.length && j >= 0 && j < newLines.length ? path[i][j] : undefined;
	for(let i = 0; i < oldLines.length; i++) {
		path.push([]);
		for(let j = 0; j < newLines.length; j++) {
			if(oldLines[i] === newLines[j]) {
				const prev = getValue(i - 1, j - 1);
				path[i][j] = {
					diffs : (prev?.diffs ?? 0),
					text : oldLines[i],
					previous : prev,
					status : "same"
				};
			} else {
				const a = getValue(i - 1, j);
				const b = getValue(i, j - 1);
				if((a?.diffs ?? Number.POSITIVE_INFINITY) < (b?.diffs ?? Number.POSITIVE_INFINITY)) {
					path[i][j] = {
						diffs: (a?.diffs ?? 0) + 1,
						text : oldLines[i],
						previous: a,
						status : "removed"
					};
				} else {
					path[i][j] = {
						diffs: (b?.diffs ?? 0) + 1,
						text : newLines[j],
						previous: b,
						status : "added"
					};
				}
			}
		}
	}
	let last = path.at(-1).at(-1);
	const output = [];
	while(last) {
		output.push(last);
		last = last.previous;
	}
	return output.reverse();
};

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
				color : "transparent",
				background : "transparent"
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
				color : "black",
				background : "transparent"
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
	const [code, setCode] = React.useState("");
	const [cursor, setCursor] = React.useState({
		start : 0,
		end : 0
	});
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
		if(fileChangeItem) {
			const changes = fileChangeItem ? diffChars(fileChangeItem.original, fileChangeItem.modified) : "";
			const code = fileChangeItem.original;
			setCode(code);
			const interval = setInterval(() => {
				setCursor(cursor => {
					const at = (cursor.start + 1) % (code.length + 1);
					return {
						start : at,
						end : at
					};
				});
			}, 100);
			return () => clearInterval(interval);
		}		
	}, [fileChange]);
	React.useEffect(() => {
		const draw = () => {
			frame = requestAnimationFrame(draw);
			const context = canvas.current.getContext("2d");
			context.font = "16px Courier New";
			const characters = position(code, context);
			highlight(characters, cursor);
			if(characters.length) {
				const last = characters.at(-1);
				const width = characters.reduce((max, character) => {
					return Math.max(max, character.x + character.width);
				}, 0);
				const height = last.y + last.height;
				canvas.current.width = width * devicePixelRatio;
				canvas.current.height = height * devicePixelRatio;
				canvas.current.style.width = `${width}px`;
				canvas.current.style.height = `${height}px`;
				context.font = "16px Courier New";
				context.textAlign = "left";
				context.textBaseline = "top";
				context.scale(devicePixelRatio, devicePixelRatio);
				characters.forEach(character => {
					context.fillStyle = character.background;
					context.fillRect(character.x, character.y, character.width, character.height);
					context.fillStyle = character.color;
					context.fillText(character.character, character.x, character.y);
				});
				if(cursor.start === cursor.end) {
					const theta = 2 * Math.PI * Date.now() / 1000;
					const progress = (Math.sin(theta) + 1) / 2;
					context.fillStyle = `rgba(0, 0, 0, ${progress})`;
					if(cursor.start === 0) {
						context.fillRect(characters[0].x - 1, characters[0].y, 2, 16);
					} else {
						const character = characters[cursor.start - 1];
						context.fillRect(character.x + character.width - 1, character.y, 2, 16);
					}
				}
			}
		};
		let frame = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(frame);
	}, [code, cursor]);
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