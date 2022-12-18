import { NS } from "@ns";
import { getAllServers } from "./network";

export async function main(ns: NS) {
	ns.tprint(getHosts(ns, ns.args[0] as number ?? 0));
}

export function getHosts(ns: NS, ramPerThread: number, ignored: string[] = []) {
	const allServers = getAllServers(ns).filter(s => !ignored.includes(s));
	const rooted = allServers.filter(s => ns.hasRootAccess(s));
	const enoughRam = rooted.filter(s => ns.getServerMaxRam(s) > ramPerThread);
	return enoughRam;
}

export function mapHosts(ns: NS, hosts: string[], ramPerThread: number, maxThreads = Number.MAX_SAFE_INTEGER, allowEmpty = false) {
	const mapped = hosts.map(host => {
		const server = ns.getServer(host);
		const threads = Math.min(maxThreads, Math.floor((server.maxRam - server.ramUsed) / ramPerThread));
		return {
			server: host,
			threads
		};
	});
	return mapped.filter(o => allowEmpty || o.threads > 0);
}

export async function waitPids(ns: NS, pids: number[]) {
	while (pids.some(pid => ns.isRunning(pid))) await ns.sleep(10);
}