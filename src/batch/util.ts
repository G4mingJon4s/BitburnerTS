import type { NS } from "@ns";
import { calculateGrowThreads } from "batch/lambert.js";
import { FILENAME as NETWORKFILE, getAllServers } from "network.js";
import { FILENAME as SERVERFILE } from "server/server.js";
import { FILENAME as MONEYFILE } from "money.js";
import { FILENAME as TABLEFILE } from "table.js";

export const SPACER = 50;
export const WINDOW = SPACER * 4;
export const FINISHORDER = "H W1G W2";
export const BASETOLERANCE = SPACER - 10;

export const TASKFILE = "/batch/task.js";
export const BATCHFILE = "/batch/batch.js";
export const UTILFILE = "/batch/util.js";
export const LAMBERTFILE = "/batch/lambert.js";

export const BATCHINGFILES = [TASKFILE, BATCHFILE, UTILFILE, LAMBERTFILE, NETWORKFILE, SERVERFILE, MONEYFILE, TABLEFILE];

export async function main(ns: NS) {
	ns.tprint(JSON.stringify(getCalculations(ns, "joesguns", 0.05, 5)));
}

export function getCalculations(ns: NS, target: string, hackP: number, hostRam: number, hostCores = 1) {
	const scriptCost = 1.75; // hack is also 1.75, because task.ts does some shenanigans to get all operations to cost the same

	const player = ns.getPlayer();

	const server = ns.getServer(target);
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

/*
OLD RATING FORMULA: Math.ceil(gain * hackChance * Math.min(Math.floor(totalRam / cost), maxBatches) / ((weakenTime + (SPACER * 2)) / 1000))
*/

export function getBestServer(ns: NS, hostname = ns.getHostname()) {
	const servers = getHackableServers(ns);
	const benchmarks = servers.flatMap(s => benchmarkServer(ns, s, hostname)).sort((a, b) => b.ramRate - a.ramRate);

	return benchmarks[0];
}

/**
 * Do NOT await the second function !!!
 * Do NOT use any other async ns calls, except asleep !!!
 */
export function useBestServer(ns: NS, hostname = ns.getHostname()): [(() => { server: string; percentage: number; }), ((ns: NS) => Promise<never>)] {
	let data = getBestServer(ns, hostname);

	const getter = () => ({
		server: data.server,
		percentage: data.percentage
	});
	const updater = async (ns: NS) => {
		while (true) {
			await ns.asleep(0);
			data = getBestServer(ns, hostname);
		}
	};

	return [getter, updater];
}

export const BATCHRAMPERCENTAGES: Record<string, number> = {
	"n00dles": 0,
	"foodnstuff": 0,
	"sigma-cosmetics": 0,
	"joesguns": 0,
	"hong-fang-tea": 0,
	"harakiri-sushi": 0,
	"nectar-net": 0,
};

export const BATCHRAMBASEPERCENTAGE = 0.6;

export function getServerRamPercentage(server: string) {
	return Object.entries(BATCHRAMPERCENTAGES).find(o => o[0] === server)?.[1] ?? BATCHRAMBASEPERCENTAGE;
}

export function getHackableServers(ns: NS) {
	return getAllServers(ns).filter(s => ns.getServerMaxMoney(s) > 0 && ns.hasRootAccess(s) && ns.getServerRequiredHackingLevel(s) < ns.getPlayer().skills.hacking);
}

export function getBatchesRunning(ns: NS) {
	return getAllServers(ns).flatMap(s => ns.ps(s).filter(t => t.filename === TASKFILE));
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