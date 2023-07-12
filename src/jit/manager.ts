import type { NS } from "@ns";
import { type HostData, type TargetData, type Task, createBatch, getBestServer } from "jit/util";

export async function main(ns: NS) {
	ns.disableLog("ALL");
}

export class Manager {
	queuedTasks: Task[];
	runningTasks: Task[];
	target: TargetData = {
		target: "",
		percentage: 0
	};
	host: HostData;

	constructor(ns: NS, host: HostData) {
		this.queuedTasks = [];
		this.runningTasks = [];
		this.host = host;
		
		this.updateTarget(ns);
	}

	update(ns: NS) {
		console.log("WIP");
	}

	abortBatch(ns: NS, batch: number) {
		[...this.queuedTasks, ...this.runningTasks].filter(task => task.batch === batch).forEach(task => task.abort(ns));

		this.queuedTasks = this.queuedTasks.filter(task => !task.isAborted);
		this.runningTasks = this.runningTasks.filter(task => !task.isAborted);
	}

	addBatch(ns: NS, start: number) {
		const tasks = createBatch(ns, start, this.target, this.host, ns.pid);

		this.queuedTasks.push(...tasks);
	}

	updateTarget(ns: NS) {
		const benchmark = getBestServer(ns);
		this.target = {
			target: benchmark.server,
			percentage: benchmark.percentage
		};
	}
}