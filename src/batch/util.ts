import { NS } from "@ns";
import { execute, getRamCost } from "/exploit/execute";

export type BatchHosts = {
	weaken: string;
	grow: string;
	hack: string;
};

export type BatchThreads = {
	weaken: number;
	grow: number;
	hack: number;
};

export type BatchInfo = {
	target: string;
	hosts: BatchHosts;
	threads: BatchThreads;
};

export const availableRam = (ns: NS, server: string): number => ns.getServerMaxRam(server) - ns.getServerUsedRam(server);

export const batchFits = (ns: NS, hosts: BatchHosts, threads: BatchThreads): boolean => {
	const weakenRam = getRamCost(ns, ["weaken"]) * threads.weaken;
	const growRam = getRamCost(ns, ["grow"]) * threads.grow;
	const hackRam = getRamCost(ns, ["hack"]) * threads.hack;

	// If a host is used for more than one task, it must have enough ram for all tasks
	const servers: Record<string, number> = {};
	servers[hosts.weaken] = weakenRam;
	servers[hosts.grow] = (servers[hosts.grow] ?? 0) + growRam;
	servers[hosts.hack] = (servers[hosts.hack] ?? 0) + hackRam;
	return [hosts.weaken, hosts.grow, hosts.hack].every(host => servers[host] < availableRam(ns, host));
};

export async function prep(ns: NS, info: { target: string; hosts: BatchHosts; }): Promise<void> {
	await ns.asleep(0);

	const maxGrowThreads = Math.floor(availableRam(ns, info.hosts.grow) / getRamCost(ns, ["grow"]));
	if (ns.getServerMoneyAvailable(info.target) !== ns.getServerMaxMoney(info.target)) await execute(
		ns,
		{
			ram: getRamCost(ns, ["grow"]),
			threads: maxGrowThreads,
			host: info.hosts.grow
		}, async ns => await ns["grow"](info.target)
	);

	const maxWeakenThreads = Math.floor(availableRam(ns, info.hosts.weaken) / getRamCost(ns, ["weaken"]));
	if (ns.getServerSecurityLevel(info.target) !== ns.getServerMinSecurityLevel(info.target)) await execute(
		ns,
		{
			ram: getRamCost(ns, ["weaken"]),
			threads: maxWeakenThreads,
			host: info.hosts.weaken
		},
		async ns => await ns["weaken"](info.target)
	);
}

export async function batch(ns: NS, info: BatchInfo): Promise<boolean> {
	const weakenTime = ns.getWeakenTime(info.target);
	const hackDelay = weakenTime - ns.getHackTime(info.target);
	const growDelay = weakenTime - ns.getGrowTime(info.target);
	const result: number[] = [];

	await Promise.all([
		execute(
			ns,
			{
				ram: getRamCost(ns, ["hack"]),
				threads: info.threads.hack,
				host: info.hosts.hack
			}, async ns => {
				await ns["hack"](info.target, { additionalMsec: hackDelay });
				result.push(0);
			}
		),
		execute(
			ns,
			{
				ram: getRamCost(ns, ["grow"]),
				threads: info.threads.grow,
				host: info.hosts.grow
			}, async ns => {
				await ns["grow"](info.target, { additionalMsec: growDelay });
				result.push(1);
			}
		),
		execute(
			ns,
			{
				ram: getRamCost(ns, ["weaken"]),
				threads: info.threads.weaken,
				host: info.hosts.weaken
			},
			async ns => {
				await ns["weaken"](info.target);
				result.push(2);
			}
		),
	]);

	const success = result.length === 3 && result.every((v, i) => v === i);
	if (!success) console.log("%cBATCH FAILED", "color: darkred");
	else console.log("%cBATCH SUCCESS", "color: green");
	return success;
}

export function calculateBatchThreads(ns: NS, target: string, hosts: BatchHosts, hackThreadCap = 128): BatchThreads & { ram: number; numPossible: number; } {
	const server = ns.getServer(target);
	server.moneyAvailable = server.moneyMax;
	server.hackDifficulty = server.minDifficulty;
	const player = ns.getPlayer();

	const maxHackThreads = Math.min(Math.floor(availableRam(ns, hosts.hack) / getRamCost(ns, ["hack"])), hackThreadCap);
	const hackThreadsEffect = Array.from({ length: maxHackThreads }, (_, i) => i + 1).map(num => {
		const amountStolen = ns.formulas.hacking.hackPercent(server, player) * num;
		server.moneyAvailable = server.moneyMax! * (1 - amountStolen);

		const growThreads = ns.formulas.hacking.growThreads(server, player, server.moneyMax!, ns.getServer(hosts.grow).cpuCores) + 1;

		const hackSecurity = ns.hackAnalyzeSecurity(num);
		const growSecurity = ns.growthAnalyzeSecurity(growThreads);

		let weakenThreads = 1;
		while (ns.weakenAnalyze(weakenThreads, ns.getServer(hosts.weaken).cpuCores) <= hackSecurity + growSecurity && weakenThreads < 1000) weakenThreads++;
		if (weakenThreads === 1000) throw new Error("Can't weaken enough");

		const totalRam = getRamCost(ns, ["weaken"]) * weakenThreads + getRamCost(ns, ["grow"]) * growThreads + getRamCost(ns, ["hack"]) * num;
		const hackPossible = Math.floor(ns.getServerMaxRam(hosts.hack) / (getRamCost(ns, ["hack"]) * num));
		const growPossible = Math.floor(ns.getServerMaxRam(hosts.grow) / (getRamCost(ns, ["grow"]) * growThreads));
		const weakenPossible = Math.floor(ns.getServerMaxRam(hosts.weaken) / (getRamCost(ns, ["weaken"]) * weakenThreads));
		const numPossible = Math.min(hackPossible, growPossible, weakenPossible);

		return {
			weakenThreads,
			growThreads,
			hackThreads: num,
			ram: totalRam,
			numPossible,
			score: amountStolen / (totalRam * ns.getWeakenTime(target)),
		};
	}).filter(entry => batchFits(ns, hosts, {
		weaken: entry.weakenThreads,
		grow: entry.growThreads,
		hack: entry.hackThreads,
	}));
	if (hackThreadsEffect.length === 0) throw new Error("No fitting threads found");

	const best = hackThreadsEffect.reduce((acc, cur) => acc.score > cur.score ? acc : cur);
	return {
		weaken: best.weakenThreads,
		grow: best.growThreads,
		hack: best.hackThreads,
		ram: best.ram,
		numPossible: best.numPossible,
	};
}

export function isPrepped(ns: NS, target: string): boolean {
	const server = ns.getServer(target);

	return server.hackDifficulty === server.minDifficulty && server.moneyAvailable === server.moneyMax;
}