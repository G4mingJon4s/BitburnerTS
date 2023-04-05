import { ActiveFragment, NS } from "@ns";
import { getAllServers } from "/network";
import { CHARGEFILE, IGNOREDHOSTS, getChargeableFrags } from "stanek/stanek";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const allFrags = getChargeableFrags(ns);
	const workers = getAllServers(ns).filter(s => !IGNOREDHOSTS.includes(s)).map(s => new StanekWorker(ns, s, allFrags));

	workers.forEach(w => ns.scp(CHARGEFILE, w.server, "home"));

	if (workers.length === 0) return ns.alert("No server found to use!");

	while (true) {
		for (let i = 0; i < workers.length; i++) {
			workers[i].process(ns);
			if (i % 8 === 0) await ns.asleep(0);
		}
		await ns.asleep(0);
	}
}

export class StanekWorker {
	server: string;
	frags: ActiveFragment[];
	pid: number[];
	ramUsed: number;
	threadCount: number;
	hasAccess: boolean;
	scriptRam: number;

	constructor(ns: NS, server: string, frags: ActiveFragment[]) {
		this.server = server;
		this.frags = frags;
		this.pid = [];

		this.ramUsed = 0;
		this.threadCount = 0;
		this.hasAccess = ns.hasRootAccess(this.server);

		this.scriptRam = ns.getScriptRam(CHARGEFILE);
	}

	process(ns: NS) {
		if (!this.hasAccess) {
			if (ns.hasRootAccess(this.server)) this.hasAccess = true;
			else return;
		}
		if (this.pid.some(p => ns.isRunning(p))) return;

		const object = ns.getServer(this.server);
		const freeRam = object.maxRam - object.ramUsed;
		const threads = freeRam === this.ramUsed ? this.threadCount : (this.threadCount = Math.floor((this.ramUsed = freeRam) / (this.frags.length * this.scriptRam)));
		if (threads <= 0) return;

		this.pid = this.frags.map(f => ns.exec(CHARGEFILE, this.server, threads, f.x, f.y));
	}
}