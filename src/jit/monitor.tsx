import type { NS } from "@ns";
import P5Canvas from "components/P5Canvas";
import type p5 from "p5";
import { parseTask, type TTask } from "jit/util";
import { type get, state } from "components/hooks";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail(); ns.atExit(() => ns.closeTail());

	const [get, set] = state<TTask[]>([]);

	ns.printRaw(<BatchCanvas get={get}/>);

	const handle = ns.getPortHandle(ns.pid);

	while (true) {
		await handle.nextWrite();
		while (!handle.empty()) {
			const data = handle.read() as string;
			const task = parseTask(data);
			if (task === null) console.error("Recieved data of invalid form!", data);
			else set(arr => { arr.push(task); return arr; });
		}
	}
}

const sketch = (tasks: () => TTask[]) => (handle: p5) => {
	handle.setup = () => {
		handle.createCanvas(500, 500);
	};

	handle.draw = () => {
		handle.background(102);

		const allTasks = tasks();

		handle.text(allTasks.length, 10, 10);
	};
};

interface Props {
	get: get<TTask[]>;
}

export function BatchCanvas({ get }: Props) {

	return <P5Canvas sketch={sketch(get)} />;
}