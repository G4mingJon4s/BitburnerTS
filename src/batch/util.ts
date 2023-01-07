import { NS } from "@ns";
import { calculateGrowThreads } from "batch/lambert";

export const SPACER = 30;
export const WINDOW = SPACER * 4;
export const FINISHORDER = "H W1G W2";
export const BASETOLERANCE = SPACER - 10;

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
	const hackCost = hackThreads * scriptCost;
	const growCost = growThreads * scriptCost;
	const weaken1Cost = weaken1Threads * scriptCost;
	const weaken2Cost = weaken2Threads * scriptCost;

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
		weaken2Cost
	};
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