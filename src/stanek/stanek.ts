import { ActiveFragment, NS } from "@ns";
import { table } from "table.js";
import { money } from "money.js";
import { getHosts, mapHosts, waitPids } from "/server/server.js";

export const CHARGEFILE = "/stanek/charge.js";
// export const IGNOREDHOSTS = ["home", /^hacknet-server-\d$/]; // removed due to BN9 run
export const IGNOREDHOSTS: string[] = [];

export async function main(ns: NS) {
	const additional = ns.args as string[];

	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	while (true) {
		const allFrags = getChargeableFrags(ns);
		const pids = launchCharge(ns, allFrags, [...IGNOREDHOSTS, ...additional]);

		await waitPids(ns, pids);
		await ns.asleep(0); // safeguard

		display(ns);
	}
}

export const STANEKRAMPERCENTAGES: Record<string, number> = {
	"n00dles": 1,
	"foodnstuff": 1,
	"sigma-cosmetics": 1,
	"joesguns": 1,
	"hong-fang-tea": 1,
	"harakiri-sushi": 1,
	"nectar-net": 1,
};

export const STANEKBASEPERCENTAGE = 0.3;

export function getServerStanekRamPercentage(server: string) {
	return Object.entries(STANEKRAMPERCENTAGES).find(o => o[0] === server)?.[1] ?? STANEKBASEPERCENTAGE;
}

export function display(ns: NS) {
	const allFrags = ns.stanek.activeFragments().filter(frag => frag.id < 100);

	const hosts = getHosts(ns, ns.getScriptRam(CHARGEFILE) * allFrags.length, IGNOREDHOSTS);

	const data = allFrags.map(frag => [`X: ${frag.x} Y: ${frag.y}`, money(frag.numCharge * frag.highestCharge, 2)]);
	const tableString = table(["Position", "Charge"], data);

	ns.clearLog();
	ns.print(`Available Server: ${hosts.length}`);
	ns.print(" ");
	ns.printf("%s", tableString);
}

export function launchCharge(ns: NS, allFrags: ActiveFragment[], invalidHosts: string[] = []) {
	const hosts = getHosts(ns, ns.getScriptRam(CHARGEFILE) * allFrags.length, invalidHosts, server => getServerStanekRamPercentage(server.hostname));

	hosts.forEach(host => ns.scp(CHARGEFILE, host, "home"));

	const mapped = mapHosts(ns, hosts, ns.getScriptRam(CHARGEFILE) * allFrags.length, undefined, undefined, server => getServerStanekRamPercentage(server.hostname));

	const pids = mapped.flatMap(host => allFrags.map(frag => ns.exec(CHARGEFILE, host.server, host.threads, frag.x, frag.y)));

	return pids;
}

export function getChargeableFrags(ns: NS) {
	return ns.stanek.activeFragments().filter(frag => frag.id < 100);
}