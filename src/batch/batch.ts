import { NS } from "@ns";
import { TASKFILE, getCalculations, isPrepped, isTaskReport, type TaskReport } from "batch/util";

export async function main(ns: NS) {
	const [id, target, percentage, pid] = ns.args as [number, string, number, number];

	const calculations = getCalculations(ns, target, percentage, ns.getServer(ns.getHostname()).cpuCores);

	const pids: number[] = [
		isPrepped(ns, target) ? ns.exec(TASKFILE, ns.getHostname(), calculations.hackThreads, id, "H ", target, calculations.startHack, ns.pid) : -1,
		ns.exec(TASKFILE, ns.getHostname(), calculations.growThreads, id, "G ", target, calculations.startGrow, ns.pid),
		ns.exec(TASKFILE, ns.getHostname(), calculations.weaken1Threads, id, "W1", target, 0, ns.pid),
		ns.exec(TASKFILE, ns.getHostname(), calculations.weaken2Threads, id, "W2", target, calculations.startWeaken2, ns.pid),
	];

	if (pids.some(p => p === 0)) return pids.forEach(ns.kill);

	while (pids.some(p => ns.isRunning(p))) await ns.sleep(0);

	const reports: TaskReport[] = [];
	const handle = ns.getPortHandle(ns.pid);

	while(!handle.empty()) {
		const object = JSON.parse(handle.read() as string) as unknown;
		if (!isTaskReport(object)) console.error(`Recieved unkown report: ${JSON.stringify(object)}`);
		else reports.push(object);
	}

	reports.sort((a, b) => a.end - b.end);

	ns.writePort(pid, JSON.stringify({
		descriptor: "BATCH-REPORT",
		id,
		reports,
		order: reports.map(a => a.type).join("").padEnd(8),
	}));
}