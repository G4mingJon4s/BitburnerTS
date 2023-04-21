import type { NS, SleeveInfiltrateTask, SleeveTask } from "@ns";
import { addBorder, progressBar } from "/table";
import { money, time } from "/money";

export const INFILTRATECYCLESNEEDED = 300;

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail(); await ns.asleep(1); ns.resizeTail(315, 770);

	const sleeves = Array.from({ length: ns.sleeve.getNumSleeves() }, (_, i) => i);

	sleeves.forEach(s => ns.sleeve.setToIdle(s));

	void draw(ns);

	while (true) {
		const mapped = sleeves.map(s => ({
			id: s,
			cycles: ns.sleeve.getSleeve(s).storedCycles
		}));

		const highest = Math.max(...mapped.map(o => o.cycles));
		const best = mapped.find(o => o.cycles === highest) ?? mapped[0];

		if (best.cycles >= 600) await performSleeveInfiltration(ns, best.id);
		ns.sleeve.setToIdle(best.id);

		await ns.asleep(50);
	}
}

export async function performSleeveInfiltration(ns: NS, id: number) {
	let cycles = 0;
	while (true) {
		const task = ns.sleeve.getTask(id);
		if (isSleeveTaskInfiltrateTask(task)) {
			const newCycles = task.cyclesWorked;
			if (newCycles < cycles) break;
			cycles = newCycles;
		} else ns.sleeve.setToBladeburnerAction(id, "Infiltrate synthoids");
		await ns.asleep(50);
	}
	Log.addGained(); // This also fires when someone set the sleeve to another operation... idrc...
}

export function isSleeveTaskInfiltrateTask(task: SleeveTask | null): task is SleeveInfiltrateTask {
	return task !== null && task.type === "INFILTRATE";
}

export async function draw(ns: NS) {
	while (true) {
		ns.clearLog();
		ns.printf("%s", Log.getLog(ns));
		await ns.asleep(0);
	}
}

export class Log {
	private static gained = 0;
	private static start = Date.now();

	static addGained() {
		this.gained += 0.5;
	}

	static getLog(ns: NS) {
		const sleeves = Array.from({ length: ns.sleeve.getNumSleeves() }, (_, i) => ({
			id: i,
			task: ns.sleeve.getTask(i),
			cycles: ns.sleeve.getSleeve(i).storedCycles
		}));

		const sleeveStrings = sleeves.flatMap(o => {
			const progress = isSleeveTaskInfiltrateTask(o.task) ? o.task.cyclesWorked / INFILTRATECYCLESNEEDED : o.cycles / INFILTRATECYCLESNEEDED;
			const nameString = `─ Sleeve #${o.id} `;
			const taskString = `Current task: ${o.task?.type === "INFILTRATE" ? "Infiltrate": "Idle"}`;
			const progressString = isSleeveTaskInfiltrateTask(o.task) ? progressBar(progress, 26) : `Infiltrations possible: ${Math.floor(progress).toString().padStart(4, "0")}`;
			const cyclesString = `Stored cycles: ${money(o.cycles, 2)}`;

			const length = Math.max(...[nameString, taskString, progressString, cyclesString].map(s => s.length));

			return [nameString.padEnd(length, "─"), taskString, progressString, cyclesString, ""];
		});

		const gainString = `Total gained: ${money(this.gained, 0)}`;
		const timeString = `Time elapsed: ${time(Date.now() - this.start)}`;
		const performanceString = `Gain per hour: ${money(this.gained / ((Date.now() - this.start) / (1000 * 60 * 60)), 2)}`;

		return addBorder([gainString, timeString, performanceString, "", ...sleeveStrings]);
	}
}