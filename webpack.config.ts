import path from "path";
import { Configuration } from "webpack";

const shared : Configuration = {
	module : {
		rules: [{
			test: /\.tsx?$/,
			use: "ts-loader",
			exclude: /node_modules/,
		}, {
			test: /\.html$/,
			use: "file-loader",
			exclude: /node_modules/,
		}],
	},
	resolve :{ 
		extensions: [".ts", ".tsx"]
	}
};

const config : Array<Configuration> = [{
	...shared,
	mode: "production",
	entry: "./src/main/index.ts",
	target: "electron-main",
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "dist", "main"),
	},
}, {
	...shared,
	mode: "production",
	entry: "./src/preload/index.ts",
	target: "electron-preload",
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "dist", "preload"),
	},
}, {
	...shared,
	mode: "production",
	entry: "./src/renderer/index.tsx",
	target: ["electron-renderer"],
	output: {
		filename: "index.js",
		path: path.resolve(__dirname, "dist", "renderer"),
	},
}];

export default config;