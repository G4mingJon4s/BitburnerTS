import { NS } from "@ns";
import { calculateGrowThreads } from "./lambert";

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

const HACKP = 0.7;
const TARGET = "joesguns";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const schedule = new Schedule();
	ns.clearPort(PORT);
	
	let batchId = 0;
	let nextBatch = performance.now();

	while (true) {
		while (schedule.filterTasks(Operations[4]).length < 2) {
			while (nextBatch < performance.now()) {
				nextBatch += WINDOW;
				ns.print("WARN: Skipping ahead, we are lagging behind!");
			}
			const { totalRamCost } = getCalculations(ns, TARGET, HACKP);
			if (totalRamCost < getFreeRam(ns, ns.getHostname())) {
				const id = batchId++;
				schedule.addTasks(new Task(-1, id, Operations[4], nextBatch, BASETOLERANCE, () => new Batch(id).createTasks(ns, schedule), []));

				console.log("Adding Batch");
			}
			nextBatch += WINDOW;

			console.log(nextBatch, schedule.tasks, schedule.running, schedule.running.map(b => b.isDone()));

			await ns.asleep(0);
		}

		schedule.process(ns);
		schedule.checkPrep(ns);
		schedule.removeTasks();
		schedule.handleReports(ns);
		schedule.checkWindows(ns);

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

		console.log(this.running);

		const dismissedBatches = new Array<number>();

		for (const task of tasks) {
			if (dismissedBatches.includes(task.batch)) {
				task.aborted = true;
				continue;
			}

			task.started = now;

			const taskDrift = now - task.time;

			if (taskDrift > task.tolerance) {
				const dismissed = this.abortTask(ns, task);
				dismissedBatches.push(dismissed);
				continue;
			}

			const pid = task.start();
			if (pid === -1) continue;
			if (pid === 0) {
				const dismissed = this.abortTask(ns, task);
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

	checkPrep(ns: NS) {
		if (!isPrepped(ns, TARGET)) {
			this.running.filter(b => !b.isPrep).forEach(b => b.switchToPrep(ns));
		}
	}

	abortTask(ns: NS, task: Task) {
		if (task.type !== Operations[4]) this.abortBatch(ns, task.batch);

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
		this.tasks = this.tasks.filter(task => Number.isNaN(task.started) && !task.aborted);
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

	abortBatch(ns: NS, batchId: number) {
		
		const batch = this.running.find(batch => batch.id === batchId);
		if (batch === undefined) {
			return ns.print(`ERROR: Could not find Batch #${batchId}!`);
		}
		ns.print(`WARN: Aborting Batch #${batchId}!`);

		batch.abort(ns);

		this.tasks = this.tasks.filter(task => task.batch !== batchId);
	}

	checkWindows(ns: NS) {
		let lastStart = 0;
		let lastEnd = Number.POSITIVE_INFINITY;

		for (const batch of this.archive) {
			if (batch.aborted) continue;
			lastStart = batch.start;

			if (lastStart > lastEnd) ns.print(`ERROR: Batch #${batch.id} started before the end of the last Batch!`);

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

	/**
	 * @param type The type of the task, can be "H ", "W1", "G ", "W2" or "BA"
	 * @param time Absolute time, when to start
	 * @param func The function to run, when starting. Should return the pid of the running script. If no script is being executed, return -1.
	 * @param args The args of the function
	 */
	constructor(id: number, batch: number, type: string, time: number, tolerance: number, func: (...args: never[]) => number, args: never[]) {
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
	}

	start() {
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
		if (this.id === -1) return;
		if (this.pids[0] && ns.isRunning(this.pids[0])) {
			ns.kill(this.pids[0]);
			console.log("KILLED", this.pids[0]);
			this.isPrep = true;
		}
	}

	createTasks(ns: NS, schedule: Schedule) {
		const { hackThreads, growThreads, weaken1Threads, weaken2Threads, startHack, startGrow, startWeaken2 } = getCalculations(ns, TARGET, HACKP);

		const start = performance.now();

		const tasks: Task[] = [
			new Task(0, this.id, Operations[0], start + startHack, BASETOLERANCE, () => startTask(ns, Operations[0], this.id, TARGET, PORT, hackThreads), []),
			new Task(1, this.id, Operations[1], start, BASETOLERANCE, () => startTask(ns, Operations[1], this.id, TARGET, PORT, weaken1Threads), []),
			new Task(2, this.id, Operations[2], start + startGrow, BASETOLERANCE, () => startTask(ns, Operations[2], this.id, TARGET, PORT, growThreads), []),
			new Task(3, this.id, Operations[3], start + startWeaken2, BASETOLERANCE, () => startTask(ns, Operations[3], this.id, TARGET, PORT, weaken2Threads), []),
		];

		// if (!isPrepped(ns, TARGET)) {
		// 	tasks.shift();
		// 	this.isPrep = true;

		// 	ns.print(`WARN: Batch #${this.id} is switching to prep!`);
		// } // Test for prepping

		// TODO: REWORK ISPREPPED

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

export function getCalculations(ns: NS, target: string, hackP: number, hostName = ns.getHostname()) {
	const scriptCost = 1.75;

	const player = ns.getPlayer();

	const server = ns.getServer(target);
	server.hackDifficulty = server.minDifficulty;
	server.moneyAvailable = server.moneyMax;
	server.hasAdminRights = true;
	server.backdoorInstalled = true;

	const hostCores = ns.getServer(hostName).cpuCores;

	const hackThreads = Math.max(Math.ceil(hackP / ns.formulas.hacking.hackPercent(server, player)), 1);
	const hackTime = ns.formulas.hacking.hackTime(server, player);

	const moneyGotten = hackThreads * ns.formulas.hacking.hackPercent(server, player) * server.moneyMax;
	const growThreads = Math.max(Math.ceil(calculateGrowThreads(ns, target, moneyGotten, hostCores, { serverGrowthRate: ns.getBitNodeMultipliers().ServerGrowthRate })), 1);
	const growTime = ns.formulas.hacking.growTime(server, player);

	const weaken1Threads = Math.max(Math.ceil(ns.hackAnalyzeSecurity(hackThreads) / 0.05), 1);
	const weaken2Threads = Math.max(Math.ceil(ns.growthAnalyzeSecurity(growThreads) / 0.05), 1);
	const weakenTime = ns.formulas.hacking.weakenTime(server, player);

	const finishHack = weakenTime - SPACER;
	const finishGrow = weakenTime + SPACER;

	const startHack = finishHack - hackTime;
	const startGrow = finishGrow - growTime;
	const startWeaken2 = 2 * SPACER;

	const totalRamCost = scriptCost * (hackThreads + growThreads + weaken1Threads + weaken2Threads);

	return {
		hackThreads,
		growThreads,
		weaken1Threads,
		weaken2Threads,
		hackTime,
		growTime,
		weakenTime,
		finishHack,
		finishGrow,
		startGrow,
		startHack,
		startWeaken2,
		totalRamCost,
	};
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