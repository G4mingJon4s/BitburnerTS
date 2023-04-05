import { NS, Server } from "@ns";
import { getAllServers } from "network.js";
import { getRam, money, ram } from "money.js";

export const FILENAME = "/server/server.js";

export async function main(ns: NS) {
	await manualServerBuy(ns);
}

export function getHosts(ns: NS, ramNeeded: number | ((server: Server) => number), ignored: (string | RegExp)[] = [], ramPercentageFunc = (server: Server) => Number(server.hasAdminRights)) {
	const allServers = getAllServers(ns).filter(s => !ignored.some(h => typeof h === "string" ? s === h : h.test(s)));
	const rooted = allServers.filter(s => ns.hasRootAccess(s));
	const maxRam = (s: string) => (ramPercentageFunc(ns.getServer(s)) * ns.getServerMaxRam(s));
	const enoughRam = rooted.filter(s => (typeof ramNeeded === "number") ? maxRam(s) > ramNeeded : maxRam(s) > ramNeeded(ns.getServer(s)));
	return enoughRam;
}

export function mapHosts(ns: NS, hosts: string[], ramNeeded: number | ((server: Server) => number), maxThreads = Number.MAX_SAFE_INTEGER, allowEmpty = false, ramPercentageFunc = (server: Server) => Number(server.hasAdminRights)) {
	const mapped = hosts.map(host => {
		const server = ns.getServer(host);
		const ramPerThread = typeof ramNeeded === "number" ? ramNeeded : ramNeeded(server);
		const threads = Math.min(maxThreads, Math.floor((server.maxRam * ramPercentageFunc(server)) / ramPerThread));
		return {
			server: host,
			threads
		};
	});
	return mapped.filter(o => allowEmpty || o.threads > 0);
}

export async function waitPids(ns: NS, pids: number[]) {
	await ns.sleep(10); // this ensures any `while (true) await waitPids();` do not end in a unstopable loop
	while (pids.some(pid => ns.isRunning(pid))) await ns.sleep(10);
}

export async function manualServerBuy(ns: NS) {
	const ownedServers = ns.getPurchasedServers();

	if (ownedServers.length >= ns.getPurchasedServerLimit()) return ns.alert(`You already have ${ns.getPurchasedServerLimit()} servers!`);

	const allRamValues = Array(Math.log2(ns.getPurchasedServerMaxRam())).fill(0).map((_, i) => Math.pow(2, i + 1));

	const name = `pserv-${ownedServers.length + 1}`;

	const chosenRam = await ns.prompt("Choose a ram value", {
		type: "select",
		choices: allRamValues.map(n => ram(n))
	}) as string;

	const ramValue = getRam(chosenRam);
	if (Number.isNaN(ramValue)) return ns.alert(`Can't parse your ram choice of "${chosenRam}"`);

	const finalName = ns.purchaseServer(name, ramValue);
	if (finalName.length === 0) return ns.alert(`Failed to buy "${name}" with "${chosenRam}" for $${money(ns.getPurchasedServerCost(ramValue), 2)}`);
	return ns.alert(`Bought "${name}" with "${chosenRam}" for $${money(ns.getPurchasedServerCost(ramValue), 2)}`);
}