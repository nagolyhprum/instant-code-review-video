import * as React from "react";
import { ContextMenuCommand, ShowContextMenu } from "../constants";
import { useIpcRenderer } from "./useIpcRenderer";

interface CanvasText {
	x : number
	y : number
	width : number
	height : number
	character : string
	color : string
}

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
	const [folder, setFolder] = React.useState("");
	const [branches, setBranches] = React.useState([]);
	const [branch, setBranch] = React.useState("main");
	const [code, setCode] = React.useState(() => Array.from({
		length : 5
	}).map((_, index) => `var ${String.fromCharCode("a".charCodeAt(0) + index)} = ${index};`).join("\n"));
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
		const context = canvas.current.getContext("2d");
		context.font = "24px Courier New";
		const characters = position(code, context);
		const last = characters[characters.length - 1];
		canvas.current.width = last.x + last.width;
		canvas.current.height = last.y + last.height;
		context.font = "24px Courier New";
		context.textAlign = "left";
		context.textBaseline = "top";
		characters.forEach(character => {
			context.fillStyle = character.color;
			context.fillText(character.character, character.x, character.y);
		});
	}, [code]);
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
			<canvas ref={canvas}></canvas>
		</div>
	);
};