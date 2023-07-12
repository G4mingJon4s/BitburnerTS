import type { NS } from "@ns";
import { getAllServers } from "network";

export type TTask = {
	type: TaskType;
	batch: number;
	target: string;
	start: number;
	time: number;
	threads: number;
}

type TaskType = "H " | "W1" | "G " | "W2";

type TaskOptions = {
	start: number;
	time: number;
	threads: number;

	scriptName: string;
	hostname: string;
	callbackPid?: number;
}

export type DelayData = {
	offset: number;
}

export type FinishData = {
	type: TaskType;
	start: number;
	end: number;
	result: number;
}

export type TargetData = {
	target: string;
	percentage: number;
}

export type HostData = {
	name: string;
	ram: number;
	cores: number;
}

export function parseTask(input: string): (TTask & { callbackPid?: number}) | null {
	const parsed = JSON.parse(input) as Record<string, unknown>;

	if (!Object.hasOwn(parsed, "descriptor") || parsed.descriptor !== "TASK") return null;

	return parsed as (TTask & { callbackPid?: number});
}

export function parseDelay(input: string): DelayData | null {
	const parsed = JSON.parse(input) as Record<string, unknown>;

	if (!Object.hasOwn(parsed, "descriptor") || parsed.descriptor !== "DELAY") return null;

	return parsed as DelayData;
}

export function parseFinish(input: string): FinishData | null {
	const parsed = JSON.parse(input) as Record<string, unknown>;

	if (!Object.hasOwn(parsed, "descriptor") || parsed.descriptor !== "FINISH") return null;

	return parsed as FinishData;
}

export function getDescriptor(input: string): string | null {
	const parsed = JSON.parse(input) as Record<string, unknown>;
	if (!Object.hasOwn(parsed, "descriptor")) return null;

	return parsed.descriptor as string;
}

export function getOperationFromType(type: TaskType) {
	switch (type) {
	case "H ": return "hack";
	case "G ": return "grow";
	case "W1": return "weaken";
	case "W2": return "weaken";
	default: throw new Error(`type is not a TaskType: ${type as string}`);
	}
}

export const SPACER = 20;
export const TASKFILE = "jit/task.js";

export function createBatch(ns: NS, start: number, target: TargetData, host: HostData, callbackPid?: number) {
	const calculations = getCalculations(ns, target.target, target.percentage, host.ram, host.cores);
	const batch = Math.floor(Date.now() / 10) % 10_000_000; // make it look a bit nicer

	const tasks: Task[] = [
		new Task("H ", batch, target.target, { hostname: host.name,
			scriptName: TASKFILE,
			start: calculations.startHack + start,
			time: calculations.hackTime,
			threads: calculations.hackThreads,
			callbackPid }),
		new Task("W1", batch, target.target, { hostname: host.name,
			scriptName: TASKFILE,
			start: start,
			time: calculations.weakenTime,
			threads: calculations.weaken1Threads,
			callbackPid }),
		new Task("G ", batch, target.target, { hostname: host.name,
			scriptName: TASKFILE,
			start: calculations.startGrow + start,
			time: calculations.growTime,
			threads: calculations.growThreads,
			callbackPid }),
		new Task("W2", batch, target.target, { hostname: host.name,
			scriptName: TASKFILE,
			start: calculations.startWeaken2 + start,
			time: calculations.weakenTime,
			threads: calculations.weaken2Threads,
			callbackPid })
	];

	return tasks;
}

export class Task implements TTask {
	type: TaskType;
	batch: number;
	target: string;
	start: number;
	time: number;
	threads: number;

	scriptName: string;
	hostname: string;
	callbackPid?: number;

	runningPid: number | null = null;
	isAborted = false;

	constructor(type: TaskType, batch: number, target: string, options: TaskOptions) {
		this.type= type;
		this.batch = batch;
		this.target = target;
		this.start = options.start;
		this.time = options.time;
		this.threads = options.threads;

		this.scriptName = options.scriptName;
		this.hostname = options.hostname;
		this.callbackPid = options.callbackPid;
	}

	launch(ns: NS) {
		if (Date.now() < this.start) console.warn("Launching task too early!", Object.assign({}, this));

		const pid = ns.exec(this.scriptName, this.hostname, { threads: this.threads }, JSON.stringify(Object.assign({ descriptor: "TASK" }, this)));
		if (pid === 0) throw new Error("Launched task has pid of 0");

		this.runningPid = pid;
	}

	abort(ns: NS) {
		this.isAborted = true;
		if (this.runningPid === null) return console.error("Tried to abort task that is not running yet");
		if (!ns.isRunning(this.runningPid)) return console.error("Tried aborting task that already finished");

		ns.kill(this.runningPid);
		this.runningPid = null;
	}
}

export function benchmarkServer(ns: NS, server: string, hostname = ns.getHostname()) {
	const percentages = [1, ...Array(20).fill(0).map((_, i) => (i + 1) * 5)].map(n => Math.round(n) / 100);

	return percentages.map(p => {
		const calculations = getCalculations(ns, server, p, ns.getServer(hostname).cpuCores);
		
		return {
			server,
			percentage: p,
			ramCost: calculations.totalRamCost,
			time: calculations.totalTime,
			rate: calculations.moneyRate,
			ramRate: calculations.moneyRamRate,
		};
	});
}

export function getBestServer(ns: NS, hostname = ns.getHostname()) {
	const servers = getAllServers(ns).filter(s => ns.getServerMaxMoney(s) > 0 && ns.hasRootAccess(s) && ns.getServerRequiredHackingLevel(s) < ns.getPlayer().skills.hacking);
	const benchmarks = servers.flatMap(s => benchmarkServer(ns, s, hostname)).sort((a, b) => b.ramRate - a.ramRate);

	return benchmarks[0];
}

export function getCalculations(ns: NS, target: string, hackP: number, hostRam: number, hostCores = 1) {
	const scriptCost = 1.75; // hack is also 1.75, because task.ts does some shenanigans to get all operations to cost the same

	const player = ns.getPlayer();

	const server = ns.getServer(target);

	if (server.moneyAvailable === undefined || server.moneyMax === undefined || server.hackDifficulty === undefined || server.minDifficulty === undefined) throw new Error("Server doesn't have all required stats!");

	server.hackDifficulty = server.minDifficulty;
	server.moneyAvailable = server.moneyMax;
	server.hasAdminRights = true;
	server.backdoorInstalled = true;

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

	const totalTime = weakenTime + startWeaken2;

	const totalThreads = hackThreads + growThreads + weaken1Threads + weaken2Threads;
	const totalRamCost = scriptCost * totalThreads;
	const hackCost = hackThreads * scriptCost;
	const growCost = growThreads * scriptCost;
	const weaken1Cost = weaken1Threads * scriptCost;
	const weaken2Cost = weaken2Threads * scriptCost;

	const hackChance = ns.formulas.hacking.hackChance(server, player);

	const maxBatches = Math.floor(weakenTime / (SPACER * 4));

	const possibleBatches = Math.min(maxBatches, Math.floor(hostRam / totalRamCost));

	const moneyRate = (moneyGotten * hackChance) / totalTime;
	const moneyRamRate = moneyRate / totalRamCost;

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
		possibleBatches,
		totalTime,
		moneyRate,
		moneyRamRate
	};
}

// --------------------------------------------------------------------------------------------------------------------- //

type options = {
	moneyAvailable?: number;
	hackDifficulty?: number;
	serverGrowthRate?: number;
}

/**
 * @author m0dar <gist.github.com/xmodar>
 * {@link https://discord.com/channels/415207508303544321/415211780999217153/954213342917050398}
 *
 * type GrowOptions = Partial<{
 *   moneyAvailable: number;
 *   hackDifficulty: number;
 *   ServerGrowthRate: number; // ns.getBitNodeMultipliers().ServerGrowthRate
 *   // https://github.com/danielyxie/bitburner/blob/dev/src/BitNode/BitNode.tsx
 * }>;
 */
export function calculateGrowGain(ns: NS, host: string, threads = 1, cores = 1, opts: options = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const rate = growPercent(ns, host, threads, cores, opts);
	return Math.min(moneyMax, rate * (moneyAvailable + threads)) - moneyAvailable;
}

/** @param gain money to be added to the server after grow */
export function calculateGrowThreads(ns: NS, host: string, gain: number, cores = 1, opts: options = {}) {
	const moneyMax = ns.getServerMaxMoney(host);
	const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
	const money = Math.min(Math.max(moneyAvailable + gain, 0), moneyMax);
	const rate = Math.log(growPercent(ns, host, 1, cores, opts));
	const logX = Math.log(money * rate) + moneyAvailable * rate;
	const threads = lambertWLog(logX) / rate - moneyAvailable;
	return Math.max(Math.ceil(threads), 0);
}

function growPercent(ns: NS, host: string, threads = 1, cores = 1, opts: options = {}) {
	const {
		serverGrowthRate: serverGrowthRate = 1,
		hackDifficulty = ns.getServerSecurityLevel(host),
	} = opts;
	const growth = ns.getServerGrowth(host) / 100;
	const multiplier = ns.getPlayer().mults.hacking_grow;
	if (multiplier === undefined) throw new Error("Multiplier of \"ns.getPlayer().mults.hacking_grow\" is undefined.");
	const base = Math.min(1 + 0.03 / hackDifficulty, 1.0035);
	const power = growth * serverGrowthRate * multiplier * ((cores + 15) / 16);
	return base ** (power * threads);
}

const log1Exp: (x: number) => number = (x) => (x <= 0 ? Math.log(1 + Math.exp(x)) : x + log1Exp(-x));

/**
 * Lambert W-function for log(x) when k = 0
 * {@link https://gist.github.com/xmodar/baa392fc2bec447d10c2c20bbdcaf687}
 */
function lambertWLog(logX: number) {
	if (Number.isNaN(logX)) return NaN;
	const logXE = logX + 1;
	const logY = 0.5 * log1Exp(logXE);
	const logZ = Math.log(log1Exp(logY));
	const logN = log1Exp(0.13938040121300527 + logY);
	const logD = log1Exp(-0.7875514895451805 + logZ);
	let w = -1 + 2.036 * (logN - logD);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	w *= (logXE - Math.log(w)) / (1 + w);
	return isNaN(w) ? (logXE < 0 ? 0 : Infinity) : w;
}
