import { NS } from "@ns";
import { getAllServers } from "/network";
import { RamReserver, TASKFILE, Task, getBestPercentage, getCalculations, type Report } from "/batch/util";

export const SPACER = 30;
export const WINDOW = SPACER * 4;
export const TOLERANCE = SPACER - 10;

let batchId = 0;
let nextBatch = Date.now();

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail(); ns.moveTail(10, 10);

	const server = await ns.prompt("Choose a server", {
		type: "select",
		choices: getAllServers(ns)
	}) as string;

	if (server === "") return ns.alert("You need to choose a server!");

	const percentage = getBestPercentage(ns, server);

	await ns.sleep(3000);

	batchId = 0;
	nextBatch = Date.now();

	const schedule = new Schedule();

	while (true) {
		while (nextBatch < Date.now()) {
			nextBatch += WINDOW;
			// console.error("Skipping ahead!"); // intended behaviour now
		}

		const { totalRamCost } = getCalculations(ns, server, percentage);
		if (RamReserver.reservedRam + totalRamCost < getFreeRam(ns, ns.getHostname())) {
			const tasks = createBatch(ns, batchId++, server, percentage, nextBatch += WINDOW);

			schedule.addTasks(...tasks);

			console.log(schedule.scheduledTasks.slice(0, 99));
		} else console.warn("Not enough ram!", RamReserver.reservedRam, [...schedule.runningTasks, ...schedule.scheduledTasks].map(t => ({
			t: t.type,
			d: new Date(t.time - Date.now()).toLocaleTimeString()
		})));

		schedule.process(ns);

		await ns.asleep(0);
	}
}

export function createBatch(ns: NS, batchId: number, target: string, percentage: number, window: number, hostname = ns.getHostname()) {
	const calculations = getCalculations(ns, target, percentage, hostname);

	const tasks = [
		new Task(batchId, "H ", window + calculations.startHack, TOLERANCE, calculations.hackCost, (ctx) => startTestTask(ns, ctx.type, ctx.id, calculations.hackTime, calculations.hackThreads), []),
		new Task(batchId, "W1", window, TOLERANCE, calculations.weaken1Cost, (ctx) => startTestTask(ns, ctx.type, ctx.id, calculations.weakenTime, calculations.weaken1Threads), []),
		new Task(batchId, "G ", window + calculations.startGrow, TOLERANCE, calculations.growCost, (ctx) => startTestTask(ns, ctx.type, ctx.id, calculations.growTime, calculations.growThreads), []),
		new Task(batchId, "W2", window + calculations.startWeaken2, TOLERANCE, calculations.weaken2Cost, (ctx) => startTestTask(ns, ctx.type, ctx.id, calculations.weakenTime, calculations.weaken2Threads), []),
	];

	return tasks;
}

export function startTask(ns: NS, type: string, id: number, target: string, threads: number, hostname = ns.getHostname()) {
	if (type === "H " && !isPrepped(ns, target)) return -1;
	return ns.exec(TASKFILE, hostname, threads, id, type, target);
}

export function startTestTask(ns: NS, type: string, id: number, duration: number, threads: number, hostname = ns.getHostname()) {
	return ns.exec(TASKFILE, hostname, threads, id, type, "TEST", true, duration);
}

export function getFreeRam(ns: NS, server: string) {
	const obj = ns.getServer(server);
	return obj.maxRam - obj.ramUsed;
}

export function isPrepped(ns: NS, server: string) {
	const obj = ns.getServer(server);
	return obj.moneyAvailable === obj.moneyMax && obj.hackDifficulty === obj.minDifficulty;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isReport(object: any): object is Report {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
	return "descriptor" in object && object.descriptor === "REPORT";
}

export class Schedule {
	runningTasks: Task[];
	scheduledTasks: Task[];

	lastProcess: number;
	drift: number;

	constructor() {
		this.runningTasks = [];
		this.scheduledTasks = [];

		this.lastProcess = NaN;
		this.drift = 0;
	}

	process(ns: NS) {
		for (const task of this.runningTasks) {
			const handle = ns.getPortHandle(task.pid);

			while (!handle.empty()) {
				const data = handle.read();
				if (typeof data === "number") continue;

				const object = JSON.parse(data) as unknown;

				if (isReport(object)) task.stop(ns, object);
				else console.warn(`Recieved unkown message for Task #${task.id} on PID #${task.pid}:`, object);
			}
		}

		const now = Date.now();
		this.drift = now - this.lastProcess;

		const dueTasks = this.scheduledTasks.filter(task => task.time <= now && !task.started && !task.aborted);

		const dismissedBatches = new Array<number>();
		const successfulTasks = new Array<Task>();

		for (const task of dueTasks) {
			if (dismissedBatches.includes(task.batch)) {
				task.abort(ns, "Batch aborted");
				continue;
			}

			const drift = now - task.time;

			if (drift > task.tolerance) {
				dismissedBatches.push(task.batch);
				task.abort(ns, "Tolerance too high: " + String(drift));
				continue;
			}

			task.run();

			if (task.pid === 0) {
				dismissedBatches.push(task.batch);
				task.abort(ns, "Launch failed");
				continue;
			}

			if (task.pid === -1) {
				task.abort(ns, "Server not prepped");
				continue;
			}

			successfulTasks.push(task);
		}

		this.runningTasks.push(...successfulTasks); // add all tasks that did start
		this.scheduledTasks = this.scheduledTasks.filter(task => !successfulTasks.some(t => t.id === task.id)); // remove all tasks from the scheduled list, thad did start

		this.runningTasks.filter(task => dismissedBatches.includes(task.batch)).forEach(task => task.abort(ns, "Batch aborted")); // abort all tasks that did start, but some task in their batch didnt
		this.runningTasks = this.runningTasks.filter(task => !task.finished && !task.aborted); // remove all running tasks that are aborted or did finish

		this.lastProcess = Date.now();
	}

	addTasks(...tasks: Task[]) {
		this.scheduledTasks.push(...tasks);

		RamReserver.malloc(tasks.reduce((acc, cur) => acc + cur.cost, 0)); // might want to move ?
	}
}