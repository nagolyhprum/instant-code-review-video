import * as React from "react";
import { CanvasText, FileChange, TextNode } from "../types";
import { ContextMenuCommand, ShowContextMenu } from "../constants";
import { useIpcRenderer } from "./useIpcRenderer";

const LETTERS_PER_SECOND = 40;

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
const position = (input : string, fileChanges : FileChange[], fileChange : string, context : CanvasRenderingContext2D) : {
	lines : CanvasText[]
	code : CanvasText[]
	files : CanvasText[]
} => {
	const lineNumberWidth = 50;
	const height = parseFloat(context.font);
	const margin = 5;
	const padding = 5;
	let lineNumber = 2;
	let offset = 0;
	const files : CanvasText[] = fileChanges.map((fileChangeItem) => {
		const width = context.measureText(fileChangeItem.path).width + padding * 2;
		const ret = {
			padding,
			background : fileChangeItem.path === fileChange ? "gray" : "lightgray",
			character : fileChangeItem.path,
			color : fileChangeItem.path === fileChange ? "white" : "black",
			height : height + padding * 2,
			width,
			x : offset,
			y : 0
		};
		offset += width + margin / 2;
		return ret;
	});
	const code : CanvasText[] = [];
	const lines : CanvasText[] = [{
		padding : 0,
		background : "transparent",
		character : "1",
		color : "lightgray",
		height,
		width : lineNumberWidth,
		x : 0,
		y : height + padding * 2 + margin / 2
	}];
	let maxWidth = 0;
	let match = tokenRegexp.exec(input), x = lineNumberWidth + margin, y = height + padding * 2 + margin / 2;
	while(match) {		
		const [_, spaces, token] = match;
		spaces.split("").forEach(space => {
			const width = context.measureText(space).width;
			code.push({
				padding : 0,
				x,
				y,
				width,
				height,
				character : space,
				color : "transparent",
				background : "transparent"
			});
			maxWidth = Math.max(maxWidth, x + width);
			if(space === "\n") {
				x = lineNumberWidth + margin;
				y += height;
				lines.push({
					padding : 0,
					x : 0,
					y,
					background : "transparent",
					color : "lightgray",
					character : `${lineNumber}`,
					height,
					width : lineNumberWidth
				});
				lineNumber++;
			} else {
				x += width;
			}
		});
		token.split("").forEach(character => {
			const width = context.measureText(character).width;
			code.push({
				padding : 0,
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
	// vertical
	lines.push({
		background : "black",
		character : "",
		color : "",
		height : y,
		padding : 0,
		width : 1,
		x : lineNumberWidth + margin / 2,
		y : height + padding * 2
	});
	// horizontal
	lines.push({
		background : "black",
		character : "",
		color : "",
		height : 1,
		padding : 0,
		width : maxWidth - lineNumberWidth - margin,
		x : lineNumberWidth + margin / 2,
		y : height + padding * 2
	});
	return {
		code,
		lines,
		files
	};
};

export const App = () => {
	// custom hooks
	const ipcRenderer = useIpcRenderer();
	// state
	const [branches, setBranches] = React.useState<string[]>([]);
	// options
	const [folder, setFolder] = React.useState("");
	const [branch, setBranch] = React.useState("");
	// drawing refs
	const canvas = React.useRef<HTMLCanvasElement>(null);
	const cursor = React.useRef({
		start : 0,
		end : 0
	});
	const scroll = React.useRef({
		x : 0,
		y : 0
	});
	const fileChanges = React.useRef<FileChange[]>([]);
	const fileChange = React.useRef("");
	const playbackInterval = React.useRef<NodeJS.Timer>(null);
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
			fileChanges.current = await ipcRenderer.getFileChanges(folder, branch);
			fileChange.current = fileChanges.current[0] ? fileChanges.current[0].path : "";
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
		const draw = () => {
			frame = requestAnimationFrame(draw);
			const context = canvas.current.getContext("2d");
			context.font = "16px Courier New";
			const fileChangeItem = fileChanges.current.find(it => it.path === fileChange.current);
			if(!fileChangeItem) return;
			const characters = position(fileChangeItem.current, fileChanges.current, fileChange.current, context);
			highlight(characters.code, cursor.current);
			if(characters.code.length) {
				const width = 640;
				const height = 480;
				canvas.current.width = width * devicePixelRatio;
				canvas.current.height = height * devicePixelRatio;
				canvas.current.style.width = `${width}px`;
				canvas.current.style.height = `${height}px`;
				context.font = "16px Courier New";
				context.textAlign = "right";
				context.textBaseline = "top";
				context.scale(devicePixelRatio, devicePixelRatio);
				// AUTOSCROLL
				const cursorBounds = cursor.current.start === 0 ? characters.code[0] : characters.code[cursor.current.start - 1];
				if(cursorBounds.y + cursorBounds.height + scroll.current.y < 0) {
					console.log("we have to scroll up - this should not happen yet");
				} else if(cursorBounds.y + cursorBounds.height + scroll.current.y > canvas.current.height / 2) {
					scroll.current.y = -cursorBounds.y + cursorBounds.height / 2 + canvas.current.height / 4; 
				}
				if(cursorBounds.x + scroll.current.x > canvas.current.width / 2) {
					scroll.current.x = -cursorBounds.x + canvas.current.width / 4; 
				} else if(cursorBounds.x < canvas.current.width / 2) {
					scroll.current.x = 0;
				}
				// LINES AND FILES
				characters.files.forEach(character => {
					context.fillStyle = character.background;
					context.fillRect(character.x, character.y, character.width, character.height);
					context.fillStyle = character.color;
					context.fillText(character.character, character.x + character.width - character.padding, character.y + character.padding);
				});
				context.save();				
				context.beginPath();
				context.rect(0, characters.code[0].y, canvas.current.width, canvas.current.height);
				context.clip();
				characters.lines.forEach(character => {
					context.fillStyle = character.background;
					context.fillRect(
						character.x, 
						character.y + scroll.current.y, 
						character.width, 
						character.height
					);
					context.fillStyle = character.color;
					context.fillText(
						character.character, 
						character.x + character.width - character.padding, 
						character.y + character.padding + scroll.current.y
					);
				});
				context.beginPath();
				context.rect(characters.code[0].x, characters.code[0].y, canvas.current.width, canvas.current.height);
				context.clip();
				characters.code.forEach(character => {
					context.fillStyle = character.background;
					context.fillRect(
						character.x + scroll.current.x, 
						character.y + scroll.current.y, 
						character.width, 
						character.height
					);
					context.fillStyle = character.color;
					context.fillText(
						character.character, 
						character.x + character.width - character.padding + scroll.current.x, 
						character.y + character.padding + scroll.current.y
					);
				});
				context.restore();
				if(cursor.current.start === cursor.current.end) {
					const theta = 2 * Math.PI * Date.now() / 1000;
					const progress = (Math.sin(theta) + 1) / 2;
					context.fillStyle = `rgba(0, 0, 0, ${progress})`;
					if(cursor.current.start === 0) {
						context.fillRect(characters.code[0].x - 1, characters.code[0].y + scroll.current.y, 2, 16);
					} else {
						const character = characters.code[cursor.current.start - 1];
						context.fillRect(character.x + character.width - 1, character.y + scroll.current.y, 2, 16);
					}
				}
			}
		};
		let frame = requestAnimationFrame(draw);
		return () => cancelAnimationFrame(frame);
	}, []);
	// callbacks
	const getRepository = React.useCallback(async () => {
		setFolder(await ipcRenderer.getRepository(folder));
	}, [folder]);
	const playback = React.useCallback(() => {
		clearTimeout(playbackInterval.current);
		fileChanges.current.forEach(fileChange => {
			fileChange.current = fileChange.original;
		});
		const next = () => {
			const fileChangeItem = fileChanges.current.find(it => it.path === fileChange.current);
			if(fileChangeItem) {
				const changes = diffChars(fileChangeItem.current, fileChangeItem.modified);
				const nextChunk = changes.findIndex(it => it.status !== "same");
				if(nextChunk !== -1) {
					const chunkLength = changes.slice(nextChunk).findIndex(it => it.status === "same");
					const endChunk = chunkLength === -1 ? changes.length : chunkLength + nextChunk;
					// REMOVE FIRST
					let from = 0;
					for(let i = 0; i < nextChunk; i++) {
						from += changes[i].text.length + 1;
					}
					let end = from;
					for(let i = nextChunk; i < endChunk; i++) {
						if(changes[i].status === "removed") {
							end += changes[i].text.length + 1;
						}
					}
					cursor.current.start = from;
					cursor.current.end = from;
					if(from === end) { // THERE IS NOTHING TO REMOVE FOR THIS CHUNK, LETS ADD INSTEAD
						let added = "";
						for(let i = nextChunk; i < endChunk; i++) {
							added += "\n" + changes[i].text;
						}
						for(let i = 0; i < added.length; i++) {
							setTimeout(() => {
								fileChangeItem.current = fileChangeItem.current.substring(0, from + i - 1) + added[i] + fileChangeItem.current.substring(from + i - 1);
								cursor.current.start = cursor.current.end = from + i;
							}, i * LETTERS_PER_SECOND);
						}
						setTimeout(() => {
							next();
						}, added.length * LETTERS_PER_SECOND);
					} else { // HIGHLIGHT THEN REMOVE
						const diff = end - from;
						for(let i = 0; i <= diff; i++) {
							setTimeout(() => {
								cursor.current.end = from + i;
							}, i * 10);
						}						
						setTimeout(() => {
							fileChangeItem.current = fileChangeItem.current.substring(0, from) + fileChangeItem.current.substring(end);
							cursor.current.end = cursor.current.start;
							next();
						}, (diff + 1) * 10);
					}
				} else {
					const index = fileChanges.current.findIndex(it => it.path === fileChange.current);
					if(index + 1 < fileChanges.current.length) { // CHANGE FILES
						fileChange.current = fileChanges.current[index + 1].path;
						scroll.current.y = 0;
						next();
					} else {
						console.log("DONE");
					}
				}
			}
		};
		next();
	}, []);
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
			<button onClick={playback}>Play</button>
			<canvas ref={canvas}></canvas>
		</div>
	);
};