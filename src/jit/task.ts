import type { NS } from "@ns";
import { parseTask, getOperationFromType, type DelayData, type FinishData } from "jit/util";

export async function main(ns: NS) {
	const task = parseTask(ns.args[0] as string);
	if (task === null) throw new Error("Did not recieve task object: " + (ns.args[0] as string));

	const start = Date.now();
	const offset = task.start - start;

	if (offset < 0) console.warn(`Task is off by ${-offset}ms`, task);

	const operation = ns[getOperationFromType(task.type)](task.target, { additionalMsec: Math.max(offset, 0) });

	const delayData: DelayData = {
		offset
	};
	ns.writePort(task.callbackPid ?? ns.pid, JSON.stringify(Object.assign({ descriptor: "DELAY" }, delayData)));

	const result = await operation;
	const end = Date.now();

	const finishData: FinishData = {
		type: task.type,
		start,
		end,
		result
	};

	ns.writePort(task.callbackPid ?? ns.pid, JSON.stringify(Object.assign({ descriptor: "FINISH" }, finishData)));
}