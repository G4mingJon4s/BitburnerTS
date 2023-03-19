import { NS } from "@ns";
import { getCalculations } from "batch/util";
import { isPrepped } from "batch/test";

export const WIPTASKFILE = "batch/test/task.js";

export async function main(ns: NS) {
	const [batchId, target, percentage] = ns.args as [number, string, number];

	const calculations = getCalculations(ns, target, percentage, ns.getHostname());

	const pids: number[] = [
		isPrepped(ns, target) ? ns.exec(WIPTASKFILE, ns.getHostname(), calculations.hackThreads, batchId, "H ", target, calculations.startHack, ns.pid) : -1,
		ns.exec(WIPTASKFILE, ns.getHostname(), calculations.growThreads, batchId, "G ", target, calculations.startGrow, ns.pid),
		ns.exec(WIPTASKFILE, ns.getHostname(), calculations.weaken1Threads, batchId, "W1", target, 0, ns.pid),
		ns.exec(WIPTASKFILE, ns.getHostname(), calculations.weaken2Threads, batchId, "W2", target, calculations.startWeaken2, ns.pid),
	];

	if (pids.some(p => p === 0)) return pids.forEach(ns.kill);

	while (pids.some(p => ns.isRunning(p))) await ns.sleep(0);

	const order: string[] = [];
	const handle = ns.getPortHandle(ns.pid);

	while(!handle.empty()) order.push(handle.read() as string);

	console.log(`Batch #${batchId} finished with "${order.join("")}" order!`);
}