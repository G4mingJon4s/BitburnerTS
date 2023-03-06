import { ActiveFragment, NS } from "@ns";
import { table } from "table.js";
import { money } from "money.js";
import { getHosts, mapHosts, waitPids } from "server.js";

export const CHARGEFILE = "/stanek/charge.js";
export const IGNOREDHOSTS = ["home"];

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const allFrags = getChargeableFrags(ns);

	while (true) {
		const pids = launchCharge(ns, allFrags);

		await waitPids(ns, pids);

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

export function launchCharge(ns: NS, allFrags: ActiveFragment[]) {
	const hosts = getHosts(ns, ns.getScriptRam(CHARGEFILE) * allFrags.length, IGNOREDHOSTS);

	hosts.forEach(host => ns.scp(CHARGEFILE, host, "home"));

	const mapped = mapHosts(ns, hosts, ns.getScriptRam(CHARGEFILE) * allFrags.length);

	const pids = mapped.flatMap(host => allFrags.map(frag => ns.exec(CHARGEFILE, host.server, host.threads, frag.x, frag.y)));

	return pids;
}

export function getChargeableFrags(ns: NS) {
	return ns.stanek.activeFragments().filter(frag => frag.id < 100);
}