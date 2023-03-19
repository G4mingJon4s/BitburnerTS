import { NS } from "@ns";
import { BATCHFILE, TASKFILE, WINDOW, getBestPercentage, getCalculations, getFreeRam, isBatchReport, isPrepped } from "batch/util";
import { getAllServers } from "network";

export async function main(ns: NS) {
	let batchId = 0;

	ns.disableLog("ALL"); ns.clearLog(); 

	const server = await ns.prompt("Choose a server", {
		type: "select",
		choices: getAllServers(ns)
	}) as string;
	if (server === "") return ns.alert("You need to choose a server!");
	ns.tail();

	const percentage = getBestPercentage(ns, server);
	const additionalRam = ns.getScriptRam(BATCHFILE);
	const handle = ns.getPortHandle(ns.pid);

	while (true) {
		const { totalRamCost, maxBatches, weakenTime, possibleBatches } = getCalculations(ns, server, percentage, ns.getHostname());
		const batchesRunning = ns.ps(ns.getHostname()).filter(p => p.filename === BATCHFILE).length;

		if (totalRamCost + additionalRam < getFreeRam(ns, ns.getHostname()) && batchesRunning + 1 < maxBatches) ns.exec(BATCHFILE, ns.getHostname(), 1, batchId++, server, percentage, ns.pid);

		if (!isPrepped(ns, server)) ns.ps(ns.getHostname()).filter(t => t.filename === TASKFILE && t.args.includes("H ")).forEach(t => ns.kill(t.pid));

		while (!handle.empty()) {
			const object = JSON.parse(handle.read() as string) as unknown;
			if (!isBatchReport(object)) console.error(`Recieved unkown report: ${JSON.stringify(object)}`);
			else ns.print(`Batch #${object.id} finished with order "${object.order}"`);
		}

		await ns.asleep(Math.max(weakenTime / possibleBatches, WINDOW));
	}
}