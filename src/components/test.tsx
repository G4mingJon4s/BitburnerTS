import type p5 from "p5";
import P5Canvas from "./P5Canvas";
import type { get, set, subscribe } from "/tests/cct";
import type { NS } from "../../NetscriptDefinitions";
interface Props {
	get: get<number>;
	set: set<number>;
	subscribe: subscribe<number>;
	ns: NS;
}

const sketch = (ns: NS) => (handle: p5) => {
	handle.setup = () => {
		handle.createCanvas(500, 500);
		handle.frameRate(10);
	};

	handle.draw = () => {
		handle.background(0);
		handle.fill(255);
		handle.rect(200, 200, 30, 30);
		ns.tprint("draw");
	};
};

export default function Test({ ns, get, set, subscribe }: Props) {
	const [_, rerender] = React.useState(false);

	React.useEffect(() => subscribe(() => rerender(a => !a)), []);

	return (
		<div>
			<h1>Hello there!</h1>
			<button onClick={() => set(a => a + 1)}>Count: {get()}</button>
			<P5Canvas sketch={sketch(ns)}/>
		</div>
	);
}
