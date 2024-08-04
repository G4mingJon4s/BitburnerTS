import { NS } from "@ns";
import { batch, batchFits, BatchHosts, calculateBatchThreads, isPrepped, prep } from "./util";

const MAX = 10_000;
const MIN_OFFSET = 100;
const LEVEL_TOLERANCE = 20;

export async function main(ns: NS): Promise<void> {
	if (ns.args.length !== 1) throw new Error("Invalid arguments");
	const target = ns.args[0] as string;

	ns.disableLog("ALL");
	ns.clearLog();
	ns.tail();

	const hosts: BatchHosts = {
		weaken: "home",
		grow: "home",
		hack: "home",
	};

	while (true) {
		await ns.asleep(1000);

		ns.clearLog();
		ns.print("PREP TIME:");
		ns.print(`WEAKEN TIME: ${Math.round(ns.getWeakenTime(target) / 10) / 100}s`);
		ns.print(`GROW TIME  : ${Math.round(ns.getGrowTime(target) / 10) / 100}s`);

		console.warn("CYCLE");
		if (!isPrepped(ns, target)) console.log("%cPREPPING", "color: orange");
		while (!isPrepped(ns, target)) await prep(ns, {
			target,
			hosts,
		});

		ns.clearLog();
		ns.print("BATCH TIME:");
		ns.print(`WEAKEN TIME: ${Math.round(ns.getWeakenTime(target) / 10) / 100}s`);
		ns.print(`HACK TIME  : ${Math.round(ns.getHackTime(target) / 10) / 100}s`);
		ns.print(`GROW TIME  : ${Math.round(ns.getGrowTime(target) / 10) / 100}s`);

		const batches: Promise<boolean>[] = [];
		const hackingLevel = ns.getHackingLevel();
		const threads = calculateBatchThreads(ns, target, hosts);

		let desync = false;
		while (!desync && Math.abs(hackingLevel - ns.getHackingLevel()) < LEVEL_TOLERANCE) {
			await ns.asleep(1);

			if (batches.length >= MAX || batches.length > threads.numPossible || !batchFits(ns, hosts, threads)) await batches.shift();
			else {
				if (!isPrepped(ns, target)) {
					desync = true;
					break;
				}
				console.log(`%cSTARTING BATCH: ETA ${Math.ceil(ns.getWeakenTime(target) / 1000)}s`, "color: yellow");
				batches.push(batch(ns, {
					target,
					hosts,
					threads,
				}).catch(e => { console.error(e); desync = true; return false; }));
			}

			const offset = Math.max(ns.getWeakenTime(target) / threads.numPossible, MIN_OFFSET);
			await ns.asleep(offset);
		}
		if (desync) console.log("%cDESYNC HAPPENED", "color: darkred");
		else console.log("%cLEVEL CHANGE", "color: red");

		console.log("%cWAITING FOR BATCHES", "color: orange");
		await Promise.allSettled(batches);
	}
}