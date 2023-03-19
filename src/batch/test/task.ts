import { NS } from "@ns";

export async function main(ns: NS) {
	const [id, type, target, delay, pid] = ns.args as [number, string, string, number, number];

	if (false) ns.grow;

	await ns.sleep(delay);

	const start = Date.now();

	switch(type) {
	case "H ": { await ns["hack"](target); break; }
	case "W1": { await ns["weaken"](target); break; }
	case "G ": { await ns["grow"](target); break; }
	case "W2": { await ns["weaken"](target); break; }
	}

	const end = Date.now();

	ns.writePort(pid, type);
}