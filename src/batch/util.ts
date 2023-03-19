import { NS } from "@ns";
import { calculateGrowThreads } from "batch/lambert";
import { money } from "/money";
import { errorBoundry, httpPost } from "/getter";

export const SPACER = 50;
export const WINDOW = SPACER * 4;
export const FINISHORDER = "H W1G W2";
export const BASETOLERANCE = SPACER - 10;

export const TASKFILE = "/batch/task.js";

export function getCalculations(ns: NS, target: string, hackP: number, hostName = ns.getHostname()) {
	const scriptCost = 1.75; // hack is also 1.75, because task.ts does some shenanigans to get all operations to cost the same

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
	const growThreads = Math.max(Math.ceil(calculateGrowThreads(ns, target, moneyGotten, hostCores, {
		hackDifficulty: ns.getServer(target).hackDifficulty,
		serverGrowthRate: ns.getBitNodeMultipliers().ServerGrowthRate,
		moneyAvailable: ns.getServerMaxMoney(target) - moneyGotten
	})), 1);
	const growTime = ns.formulas.hacking.growTime(server, player);

	const weaken1Threads = Math.max(Math.ceil(ns.hackAnalyzeSecurity(hackThreads) / 0.05), 1);
	const weaken2Threads = Math.max(Math.ceil(ns.growthAnalyzeSecurity(growThreads) / 0.05), 1);
	const weakenTime = ns.formulas.hacking.weakenTime(server, player);

	const finishHack = weakenTime - SPACER;
	const finishGrow = weakenTime + SPACER;

	const startHack = finishHack - hackTime;
	const startGrow = finishGrow - growTime;
	const startWeaken2 = 2 * SPACER;

	const totalThreads = hackThreads + growThreads + weaken1Threads + weaken2Threads;
	const totalRamCost = scriptCost * totalThreads;
	const hackCost = hackThreads * scriptCost;
	const growCost = growThreads * scriptCost;
	const weaken1Cost = weaken1Threads * scriptCost;
	const weaken2Cost = weaken2Threads * scriptCost;

	const hackChance = ns.formulas.hacking.hackChance(server, player);

	const maxBatches = Math.floor(weakenTime / (SPACER * 4));
	const possibleBatches = Math.min(maxBatches, Math.floor(ns.getServerMaxRam(hostName) / totalRamCost));

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
		hackCost,
		growCost,
		weaken1Cost,
		weaken2Cost,
		moneyGotten,
		hackChance,
		totalThreads,
		maxBatches,
		possibleBatches
	};
}

export function getBestPercentage(ns: NS, target: string, hostname = ns.getHostname()) {
	const allPercentages = [1, ...Array(20).fill(0).map((_, i) => (i + 1) * 5)].map(n => Math.round(n) / 100);

	const totalRam = ns.getServerMaxRam(hostname);

	const values = allPercentages.map(p => {
		const { moneyGotten: gain, totalRamCost: cost, weakenTime, hackChance, maxBatches } = getCalculations(ns, target, p, hostname);
		return {
			percentage: p,
			gain: money(gain, 3),
			cost,
			rating: Math.ceil(gain * hackChance * Math.min(Math.floor(totalRam / cost), maxBatches) / ((weakenTime + (SPACER * 2)) / 1000))
		};
	});

	console.error("PERCENTAGE VALUES", values);

	return values.sort((a, b) => b.rating - a.rating)[0].percentage;
}

export function getUsedTaskRam(ns: NS, server: string) {
	// TODO calculate ram taken up by task.js scripts on server
	const info = ns.ps(server);
	const taskScripts = info.filter(t => t.filename === TASKFILE);
	return taskScripts.length * ns.getScriptRam(TASKFILE);
}

export const MONITORTASKURL = "http://localhost:3000/api/restTask/single";

export function sendTask(task: Task) {
	const stringified = JSON.stringify(omitTaskProperties(task));

	void errorBoundry(httpPost(MONITORTASKURL, stringified));
}

export function omitTaskProperties(task: Task) {
	const invalid = ["func", "args", "started", "finished", "pid"] as const;

	return Object.fromEntries(Object.entries(task).filter(pair => !(invalid as unknown as string[]).includes(pair[0]))) as Omit<Task, keyof typeof invalid>;
}

export class Task {
	id: number;
	batch: number;
	type: string;
	desc: string;
	time: number;
	tolerance: number;
	func: (ctx: { id: number; batch: number; type: string; }, ...args: never[]) => number;
	args: never[];
	aborted: boolean;
	start: number;
	end: number;
	cost: number;
	pid: number;
	started: boolean;
	finished: boolean;

	/**
	 * @param type The type of the task, can be "H ", "W1", "G ", "W2" or "BA"
	 * @param time Absolute time, when to start, not duration of task
	 * @param func The function to run, when starting. Should return the pid of the running script. If no script is being executed, return -1.
	 * @param args The args of the function
	 */
	constructor(batch: number, type: string | "H " | "W1" | "G " | "W2" | "BA", time: number, tolerance: number, cost: number, func: (ctx: { id: number; batch: number; type: string; }, ...args: never[]) => number, args: never[]) {
		this.id = Date.now();
		this.batch = batch;
		this.type = type;
		this.desc = `${batch}.${type.trim()}`;
		this.time = time;
		this.tolerance = tolerance;
		this.func = func;
		this.args = args;
		this.aborted = false;
		this.start = NaN;
		this.end = NaN;
		this.cost = cost;
		this.pid = NaN;
		this.started = false;
		this.finished = false;
	}

	run() {
		this.start = Date.now();
		this.started = true;
		this.pid = this.func({
			id: this.id,
			batch: this.batch,
			type: this.type
		}, ...this.args);

		RamReserver.free(this.cost);
		console.log(`Started Task of Batch #${this.batch} with type "${this.type}"`);
	}

	stop(ns: NS, report?: Report) {
		this.end = Date.now();
		this.finished = true;

		ns.print(`${this.batch}-${this.type} Finished`);

		if (report === undefined) return sendTask(this);

		this.start = report.start;
		this.end = report.end;

		console.log(report);
		
		return sendTask(this);
	}

	abort(ns: NS, reason = "") {
		if (ns.isRunning(this.pid)) ns.kill(this.pid);
		this.aborted = true;

		RamReserver.free(this.cost);

		console.warn(`Aborted Task of Batch #${this.batch} with type "${this.type}". Reason: "${reason.length === 0 ? "No Reason named" : reason}"`);
	}
}

export class RamReserver {
	static reservedRam = 0;

	static malloc(number: number) {
		RamReserver.reservedRam += number;
	}

	static free(number: number) {
		RamReserver.reservedRam -= number;
	}
}

export interface Report {
	descriptor: "REPORT";
	id: number;
	type: string;
	start: number;
	end: number;
}