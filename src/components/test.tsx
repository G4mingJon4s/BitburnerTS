import type { get, set, subscribe } from "/tests/cct";

const button: React.CSSProperties = {
	border: "2px solid white",
	background: "#ff6060",
	margin: "0.5rem",
	padding: "0.2rem",
	cursor: "pointer",
	fontSize: "18px",
	justifyContent: "center"
};

const header: React.CSSProperties = {
	color: "white",
	justifyContent: "center",
	alignItems: "center"
};

const container: React.CSSProperties = {
	height: "300px",
	width: "500px",
	display: "flex",
	flexDirection: "column"
};

interface Props {
	get: get<number>;
	set: set<number>;
	subscribe: subscribe<number>;
}

export default function Test({ get, set, subscribe }: Props) {
	const [_, rerender] = React.useState(false);

	React.useEffect(() => subscribe(() => rerender(a => !a)), []);

	return (
		<div style={container}>
			<h1 style={header}>Hello there!</h1>
			<button onClick={() => set(a => a + 1)} style={button}>Count: {get()}</button>
		</div>
	);
}
