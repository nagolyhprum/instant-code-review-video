import * as React from "react";

export const App = () => {
	const [count, setCount] = React.useState(0);
	const increase = React.useCallback(() => {
		setCount(count => count + 1);
	}, []);
	return (
		<div>
			<div>{count}</div>
			<button onClick={increase}>Increase</button>
		</div>
	);
};