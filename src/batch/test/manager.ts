import { NS } from "@ns";
import { getBestPercentage, getCalculations } from "batch/util";
import { getFreeRam } from "batch/test";
import { time } from "money";
import { getAllServers } from "network";

export const BATCHFILE = "batch/test/batch.js";

export async function main(ns: NS) {
	let batchId = 0;

	const server = await ns.prompt("Choose a server", {
		type: "select",
		choices: getAllServers(ns)
	}) as string;

	if (server === "") return ns.alert("You need to choose a server!");

	const percentage = getBestPercentage(ns, server);

	const additionalRam = ns.getScriptRam(BATCHFILE);

	while (true) {
		const { totalRamCost, maxBatches, weakenTime, possibleBatches } = getCalculations(ns, server, percentage, ns.getHostname());

		const batchesRunning = ns.ps(ns.getHostname()).filter(p => p.filename === BATCHFILE).length;

		if (totalRamCost + additionalRam < getFreeRam(ns, ns.getHostname()) && batchesRunning + 1 < maxBatches) {
			ns.exec(BATCHFILE, ns.getHostname(), 1, batchId++, server, percentage);

			console.log(`Adding Batch #${batchId}! Approximate finish in ${time(weakenTime)}`);
		}

		await ns.asleep(weakenTime / possibleBatches); // rough estimate to split the batches
	}
}