import { NS } from "@ns";
import { getAllServers } from "/network";
import { BatchHosts, BatchInfo, calculateBatchThreads } from "./util";

export async function main(ns: NS): Promise<void> {
	const servers = getAllServers(ns).filter(server => ns.getServer(server).moneyMax !== undefined);

	const hosts: BatchHosts = {
		weaken: "home",
		grow: "home",
		hack: "home",
	};

	const infos: (BatchInfo & { ram: number; numPossible: number; })[] = servers.map(server => {
		const threads = calculateBatchThreads(ns, server, hosts);

		return {
			target: server,
			threads,
			hosts,
			ram: threads.ram,
			numPossible: threads.numPossible,
		};
	});

	const fullInfo: (BatchInfo & {
		ram: number;
		numPossible: number;
		amountStolen: number;
		chance: number;
		time: number;
		score: number;
	})[] = infos.map(info => {
		const server = ns.getServer(info.target);
		server.moneyAvailable = server.moneyMax;
		server.hackDifficulty = server.minDifficulty;

		const amountStolen = ns.formulas.hacking.hackPercent(server, ns.getPlayer()) * info.threads.hack;
		const chance = ns.formulas.hacking.hackChance(server, ns.getPlayer());
		const weakenTime = ns.formulas.hacking.weakenTime(server, ns.getPlayer());

		return {
			...info,
			amountStolen,
			money: amountStolen * server.moneyMax!,
			chance,
			time: weakenTime,
			score: amountStolen * server.moneyMax! * chance / (info.ram * (weakenTime / 1000)),
		};
	});

	fullInfo.sort((a, b) => b.score - a.score);
	console.table(fullInfo, ["target", "ram", "numPossible", "money", "chance", "time", "score"]);
}