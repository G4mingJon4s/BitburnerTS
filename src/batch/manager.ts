import { NS } from "@ns";
import { BATCHFILE, WINDOW, getCalculations, getFreeRam, isBatchReport, useBestServer } from "batch/util";

export async function main(ns: NS) {
	let batchId = 0;

	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const [values, update] = useBestServer(ns);
	void update(ns);

	const additionalRam = ns.getScriptRam(BATCHFILE);
	const handle = ns.getPortHandle(ns.pid);

	while (true) {
		const { server, percentage } = values();

		const { totalRamCost, maxBatches, weakenTime, possibleBatches } = getCalculations(ns, server, percentage, ns.getHostname());
		const batchesRunning = ns.ps(ns.getHostname()).filter(p => p.filename === BATCHFILE).length;

		if (totalRamCost + additionalRam < getFreeRam(ns, ns.getHostname()) && batchesRunning + 1 < maxBatches) ns.exec(BATCHFILE, ns.getHostname(), 1, batchId++, server, percentage, ns.pid);

		// if (!isPrepped(ns, server)) ns.ps(ns.getHostname()).filter(t => t.filename === TASKFILE && t.args.includes("H ")).forEach(t => ns.kill(t.pid));

		while (!handle.empty()) {
			const object = JSON.parse(handle.read() as string) as unknown;
			if (!isBatchReport(object)) console.error(`Recieved unkown report: ${JSON.stringify(object)}`);
			else ns.print(`Batch #${object.id} finished with order "${object.order}"`);
		}

		// Math.ceil(w / p) + WINDOW - (Math.ceil(w / p) % W) <- This is the next best checkback in multiples of WINDOW. You can't checkback whenever, as you could be in a paywindow!
		await ns.asleep(Math.max(Math.ceil(weakenTime / possibleBatches) + WINDOW - (Math.ceil(weakenTime / possibleBatches) % WINDOW), WINDOW));
	}
}