import { NS } from "@ns";
import { BATCHFILE, BATCHINGFILES, WINDOW, getBatchesRunning, getCalculations, getFreeRam, isBatchReport, useBestServer } from "batch/util";

export async function main(ns: NS) {
	let batchId = 0;

	ns.disableLog("ALL"); ns.clearLog(); ns.tail();

	const [values, update] = useBestServer(ns);
	void update(ns);

	const additionalRam = ns.getScriptRam(BATCHFILE);
	const handle = ns.getPortHandle(ns.pid);

	while (true) {
		const { server, percentage } = values();

		const host = "home"; // TO BE CHANGED
		ns.scp(BATCHINGFILES, host, "home");

		const { totalRamCost, maxBatches, weakenTime, possibleBatches: totalBatchesPossible } = getCalculations(ns, server, percentage, ns.getServer(host).cpuCores);
		const batchesRunning = getBatchesRunning(ns).length;
		// const totalBatchesPossible = getTotalBatchesPossible(ns, server, percentage);

		if (totalRamCost + additionalRam < getFreeRam(ns, host) && batchesRunning + 1 < maxBatches) ns.exec(BATCHFILE, host, 1, batchId++, server, percentage, ns.pid);

		while (!handle.empty()) {
			const object = JSON.parse(handle.read() as string) as unknown;
			if (!isBatchReport(object)) console.error(`Recieved unkown report: ${JSON.stringify(object)}`);
			else ns.print(`Batch #${object.id} finished with order "${object.order}"`);
		}

		// Math.ceil(w / p) + WINDOW - (Math.ceil(w / p) % W) <- This is the next best checkback in multiples of WINDOW. You can't checkback whenever, as you could be in a paywindow!
		await ns.asleep(Math.max(Math.ceil(weakenTime / totalBatchesPossible) + WINDOW - (Math.ceil(weakenTime / totalBatchesPossible) % WINDOW), WINDOW) ?? WINDOW);
	}
}