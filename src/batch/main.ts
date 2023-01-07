import { NS } from "@ns";
import { getCalculations } from "batch/util";

export const SPACER = 30;
export const WINDOW = SPACER * 4;
export const FINISHORDER = "H W1G W2";
export const BASETOLERANCE = SPACER - 10;

export const PORT = 9;

export const OperationsNum = [
	"H ",
	"W1",
	"G ",
	"W2",
	"BA",
];

let reservedRam = 0;

const HACKP = 0.005;
const TARGET = "joesguns";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const schedule = new Schedule();
	ns.clearPort(PORT);
	
	let batchId = 0;
	let nextBatch = performance.now();

	while (true) {
		// schedule.checkPrep(ns);

		while (schedule.filterTasks(Operations[4]).length < 2) {
			while (nextBatch < performance.now()) {
				nextBatch += WINDOW;
				ns.print("WARN: Skipping ahead, we are lagging behind!");
			}

			const { totalRamCost } = getCalculations(ns, TARGET, HACKP);
			if (totalRamCost < getFreeRam(ns, ns.getHostname()) - reservedRam) {
				const id = batchId++;
				schedule.addTasks(new Task(-1, id, Operations[4], nextBatch, totalRamCost, BASETOLERANCE, () => new Batch(id).createTasks(ns, schedule), []));

				reservedRam += totalRamCost;
			} else {
				if (nextBatch < performance.now() + WINDOW) nextBatch += WINDOW; // no idea
				break;
			}

			nextBatch += WINDOW;

			await ns.asleep(0);
		}

		schedule.process(ns);
		schedule.removeTasks();
		schedule.handleReports(ns);
		// schedule.checkWindows(ns);

		await ns.asleep(0);
	}
}

export class Schedule {
	tasks: Task[];
	running: Batch[];
	lastProcess: number;
	drift: number;
	archive: Batch[];

	constructor() {
		this.tasks = [];
		this.running = [];
		this.lastProcess = performance.now();
		this.drift = 0;
		this.archive = [];
	}

	process(ns: NS) {
		const now = performance.now();
		this.drift = now - this.lastProcess;

		const tasks = this.tasks.filter(task => task.time <= now && Number.isNaN(task.started) && !task.aborted);

		const dismissedBatches = new Array<number>();

		for (const task of tasks) {
			if (dismissedBatches.includes(task.batch)) {
				task.aborted = true;
				continue;
			}

			task.started = now;

			const taskDrift = now - task.time;

			if (taskDrift > task.tolerance) {
				const dismissed = this.abortTask(ns, task, "Drift too high");
				dismissedBatches.push(dismissed);
				continue;
			}

			const pid = task.start();
			if (pid === -1) {
				if (task.type !== Operations[4]) {
					this.getBatch(task.batch).isPrep = true;
					// this.switchPrep(ns);
				}
				continue;
			}
			if (pid === 0) {
				const dismissed = this.abortTask(ns, task, "No pid");
				dismissedBatches.push(dismissed);
			}

			const batch = this.running.find(batch => batch.id === task.batch);
			if (batch === undefined) {
				ns.print(`ERROR: Batch #${task.batch} was not found! Killing the executed script!`);
				ns.kill(pid);
				continue;
			}

			batch.addRunningScript({
				pid,
				type: task.type
			});
		}

		this.lastProcess = performance.now();
	}

	switchPrep(ns: NS) {
		this.running.sort((a, b) => a.id - b.id).slice(0, 10).filter(b => !b.isPrep).forEach(b => b.switchToPrep(ns)); // slicing values are chosen randomly
	}

	getBatch(batchId: number) {
		const batch = this.running.find(batch => batch.id === batchId);
		if (batch === undefined) throw new Error(`Could not find Batch #${batchId}`);
		return batch;
	}

	abortTask(ns: NS, task: Task, reason = "") {
		if (task.type !== Operations[4]) this.abortBatch(ns, task.batch, reason);

		task.aborted = true;

		return task.batch;
	}

	handleReports(ns: NS) {
		const handle = ns.getPortHandle(PORT);

		while (!handle.empty()) {
			const raw = handle.read() as string;
			const report = JSON.parse(raw) as Report;

			const batch = this.running.find(batch => batch.id === report.id);
			if (batch === undefined) {
				ns.print(`WARN: Dismissing unknown report! ID: ${report.id}, TYPE: ${report.type}.`);
				continue;
			}

			batch.handleReport(ns, report);
		}
	}

	removeTasks() {
		const relevantTasks = new Array<Task>();
		const dismissedTasks = new Array<Task>();
		for (const task of this.tasks) {
			console.log(new Date(task.time).toUTCString(), new Date(performance.now()).toUTCString(), new Date(task.time - performance.now()).toUTCString());
			if (task.aborted || !Number.isNaN(task.started) || task.time + task.tolerance < performance.now()) {
				dismissedTasks.push(task);
				continue;
			}
			relevantTasks.push(task);
		}
		this.tasks = relevantTasks;

		dismissedTasks.forEach(task => {
			if (!task.isFinished) reservedRam -= task.cost; // remove reserved cost, as the task is never gonna run. If it already ran, don't remove the ram twice.
		});

		this.running = this.running.filter(batch => {
			if (batch.isDone()) {
				if (!batch.aborted) this.archive.unshift(batch);
				return false;
			} else {
				return true;
			}
		});
	}

	removeArchive() {
		this.archive = this.archive.slice(0, 10);
	}

	abortBatch(ns: NS, batchId: number, reason = "") {
		
		const batch = this.running.find(batch => batch.id === batchId);
		if (batch === undefined) {
			return ns.print(`ERROR: Could not find Batch #${batchId}!`);
		}

		ns.print(`WARN: Aborting Batch #${batchId}!${reason.length === 0 ? "" : ` Reason: "${reason}"`}`);

		batch.abort(ns);

		this.tasks = this.tasks.filter(task => task.batch !== batchId);
	}

	checkWindows(ns: NS) {
		let lastStart = 0;
		let lastEnd = 0;

		for (const batch of this.archive) {
			if (batch.aborted) continue;
			lastStart = batch.start;

			if (lastStart < lastEnd) ns.print(`ERROR: Batch #${batch.id} started before the end of the last Batch!`);

			lastEnd = batch.end;
		}

		this.removeArchive();
	}

	filterTasks(type: string) {
		return this.tasks.filter(task => task.type === type);
	}

	addTasks(...tasks: Task[]) {
		this.tasks.push(...tasks);
	}

	addBatch(batch: Batch) {
		this.running.push(batch);
	}
}

export function startTask(ns: NS, type: string, id: number, target: string, port: number, threads: number) {
	if (type === Operations[0] && !isPrepped(ns, target)) return -1;
	return ns.exec("/batch/task.js", "home", threads, id, type, target, port);
}

export function getFreeRam(ns: NS, server: string) {
	const obj = ns.getServer(server);
	return obj.maxRam - obj.ramUsed;
}

export function isPrepped(ns: NS, server: string) {
	const obj = ns.getServer(server);
	return obj.moneyAvailable === obj.moneyMax && obj.hackDifficulty === obj.minDifficulty;
}

export class Task {
	id: number;
	batch: number;
	type: string;
	desc: string;
	time: number;
	tolerance: number;
	func: (...args: never[]) => number;
	args: never[];
	aborted: boolean;
	started: number;
	cost: number;
	isFinished: boolean;

	/**
	 * @param type The type of the task, can be "H ", "W1", "G ", "W2" or "BA"
	 * @param time Absolute time, when to start
	 * @param func The function to run, when starting. Should return the pid of the running script. If no script is being executed, return -1.
	 * @param args The args of the function
	 */
	constructor(id: number, batch: number, type: string, time: number, cost: number, tolerance: number, func: (...args: never[]) => number, args: never[]) {
		this.id = id;
		this.batch = batch;
		this.type = type;
		this.desc = `${batch}.${type.trim()}`;
		this.time = time;
		this.tolerance = tolerance;
		this.func = func;
		this.args = args;
		this.aborted = false;
		this.started = NaN;
		this.cost = cost;
		this.isFinished = false;
	}

	start() {
		reservedRam -= this.cost;
		this.isFinished = true;
		return this.func(...this.args);
	}
}

export class Batch {
	id: number;
	pids: number[];
	finished: number;
	order: string;
	aborted: boolean;
	start: number;
	end: number;
	isPrep: boolean;

	constructor(id: number) {
		this.id = id;
		this.pids = [0, 0, 0, 0];
		this.finished = 0;
		this.order = "";
		this.aborted = false;
		this.start = NaN;
		this.end = NaN;
		this.isPrep = false;
	}

	handleReport(ns: NS, report: Report) {
		if (this.finished >= (this.isPrep ? 3 : 4)) ns.print(`ERROR: Batch #${this.id} already has ${this.finished} finished Operations! Operation of type "${report.type}" got reported. Current order: "${this.order}".`);
		
		if (this.finished === 0) this.start = report.end;
		
		this.finished++;
		this.order += report.type;

		if (this.finished >= (this.isPrep ? 3 : 4)) this.end = report.end;

		// If the batch is a prep batch, the order is not important
		if (this.finished === 4 && !this.isPrep) ns.print(this.order === FINISHORDER ? `SUCCESS: Batch #${this.id} finished in order!` : `ERROR: Batch #${this.id} finished with a order of "${this.order}"!`);
	}

	isDone() {
		if (this.isPrep) return this.finished >= 3 || this.aborted;
		return this.finished >= 4 || this.aborted;
	}

	switchToPrep(ns: NS) {
		ns.print(`WARN: Switching Batch #${this.id} to prep! Paywindow check?`);
		if (this.id === -1) return;
		if (this.pids[0] && ns.isRunning(this.pids[0])) {
			console.log("TOPREP", this.pids[0], ns.getRunningScript(this.pids[0])?.args);
			ns.kill(this.pids[0]);
			this.isPrep = true;
		}
	}

	createTasks(ns: NS, schedule: Schedule) {
		const { hackThreads, growThreads, weaken1Threads, weaken2Threads, startHack, startGrow, startWeaken2, hackCost, growCost,	weaken1Cost, weaken2Cost, totalRamCost } = getCalculations(ns, TARGET, HACKP);

		const start = performance.now();

		const tasks: Task[] = [
			new Task(0, this.id, Operations[0], start + startHack, hackCost, BASETOLERANCE, () => startTask(ns, Operations[0], this.id, TARGET, PORT, hackThreads), []),
			new Task(1, this.id, Operations[1], start, weaken1Cost, BASETOLERANCE, () => startTask(ns, Operations[1], this.id, TARGET, PORT, weaken1Threads), []),
			new Task(2, this.id, Operations[2], start + startGrow, growCost, BASETOLERANCE, () => startTask(ns, Operations[2], this.id, TARGET, PORT, growThreads), []),
			new Task(3, this.id, Operations[3], start + startWeaken2, weaken2Cost, BASETOLERANCE, () => startTask(ns, Operations[3], this.id, TARGET, PORT, weaken2Threads), []),
		];

		reservedRam += totalRamCost;

		schedule.addTasks(...tasks);
		schedule.addBatch(this);

		return -1;
	}

	addRunningScript({ pid, type }: { pid: number, type: string }) {
		this.pids[OperationsNum.indexOf(type)] = pid;
	}

	abort(ns: NS) {
		this.pids.forEach(pid => ns.kill(pid));
		this.aborted = true;
	}
}

export type Report = {
	id: number; // Batch ID, not Task ID
	type: string | Operations; // like "H ", or "W1" etc.
	start: number;
	end: number;
}

export enum Operations {
	"H " = 0,
	"W1" = 1,
	"G " = 2,
	"W2" = 3,
	"BA" = 4,
}