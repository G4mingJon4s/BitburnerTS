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
	const hosts = getHosts(ns, ns.getScriptRam(CHARGEFILE) * allFrags.length, invalidHosts);

	hosts.forEach(host => ns.scp(CHARGEFILE, host, "home"));

	const mapped = mapHosts(ns, hosts, ns.getScriptRam(CHARGEFILE) * allFrags.length);

	const pids = mapped.flatMap(host => allFrags.map(frag => ns.exec(CHARGEFILE, host.server, host.threads, frag.x, frag.y)));

	return pids;
}

export function getChargeableFrags(ns: NS) {
	return ns.stanek.activeFragments().filter(frag => frag.id < 100);
}