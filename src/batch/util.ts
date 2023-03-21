import { NS } from "@ns";
import { calculateGrowThreads } from "batch/lambert";
import { money } from "money";

export const SPACER = 50;
export const WINDOW = SPACER * 4;
export const FINISHORDER = "H W1G W2";
export const BASETOLERANCE = SPACER - 10;

export const TASKFILE = "batch/task.js";
export const BATCHFILE = "batch/batch.js";

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

export function getFreeRam(ns: NS, server: string) {
	return ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
}

export function isPrepped(ns: NS, server: string) {
	const object = ns.getServer(server);
	return object.minDifficulty === object.hackDifficulty && object.moneyMax === object.moneyAvailable;
}

export interface TaskReport {
	descriptor: "TASK-REPORT";
	id: number;
	type: string;
	start: number;
	end: number;
	delay: number;
}

export interface BatchReport {
	descriptor: "BATCH-REPORT";
	id: number;
	order: string;
	reports: TaskReport[];
}

export function isTaskReport(obj: unknown): obj is TaskReport {
	return (obj as TaskReport)?.descriptor !== undefined && (obj as TaskReport)?.descriptor === "TASK-REPORT";
}

export function isBatchReport(obj: unknown): obj is BatchReport {
	return (obj as BatchReport)?.descriptor !== undefined && (obj as BatchReport)?.descriptor === "BATCH-REPORT";
}