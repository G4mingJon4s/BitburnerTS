import { NS } from "@ns";
import { table } from "table";

export const STANEKHOSTS = ["joesguns", "hong-fang-tea", "sigma-cosmetics", "the-hub", "phantasy", "ecorp", "pserv"];
export const CHARGEFILE = "charge.js";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog();

	const allFrags = ns.stanek.activeFragments().filter(frag => frag.id < 100);

	STANEKHOSTS.filter(host => ns.serverExists(host)).forEach(host => ns.scp(CHARGEFILE, host, "home"));

	while (true) {
		const threads = STANEKHOSTS.filter(host => ns.serverExists(host) && ns.hasRootAccess(host)).map(host => Math.floor((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / (ns.getScriptRam(CHARGEFILE) * allFrags.length)));
		const pids = STANEKHOSTS.filter((host, i) => ns.serverExists(host) && ns.hasRootAccess(host) && threads[i] > 0).flatMap((host, i) => allFrags.map(frag => ns.exec(CHARGEFILE, host, threads[i], frag.x, frag.y)));

		while (pids.some(pid => ns.isRunning(pid))) await ns.sleep(50);

		display(ns);
	}
}

export function display(ns: NS) {
	const allFrags = ns.stanek.activeFragments().filter(frag => frag.id < 100);
	const data = allFrags.map(frag => [`X: ${frag.x} Y: ${frag.y}`, frag.numCharge.toExponential()]);
	const tableString = table(["Position", "Charge"], data);

	ns.clearLog();
	ns.printf("%s", tableString);
}