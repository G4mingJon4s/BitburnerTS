import { ActiveFragment, NS } from "@ns";
import { CHARGEFILE, getChargeableFrags } from "stanek/stanek";
import { mapHosts, waitPids } from "server.js";

export async function main(ns: NS) {
	const allFrags = getChargeableFrags(ns);

	ns.scp(CHARGEFILE, ns.getHostname(), "home");

	while (true) {
		const pids = launchOwnCharge(ns, allFrags);

		await waitPids(ns, pids);
	}
}

export function launchOwnCharge(ns: NS, allFrags: ActiveFragment[]): number[] {
	const [server] = mapHosts(ns, [ns.getHostname()], ns.getScriptRam(CHARGEFILE) * allFrags.length, Number.MAX_SAFE_INTEGER, true);

	if (server.threads === 0) return [];
	else return allFrags.map(frag => ns.exec(CHARGEFILE, ns.getHostname(), server.threads, frag.x, frag.y));
}
