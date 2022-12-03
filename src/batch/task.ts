import { NS } from "@ns";

export async function main(ns: NS) {
	const [id, type, target, port] = ns.args as [number, string, string, number];

	if (false) ns.grow;

	const start = performance.now();

	switch(type) {
	case "H ": { await ns["hack"](target); break; }
	case "W1": { await ns["weaken"](target); break; }
	case "G ": { await ns["grow"](target); break; }
	case "W2": { await ns["weaken"](target); break; }
	}

	const end = performance.now();

	await ns.writePort(port, JSON.stringify({
		id,
		type,
		start,
		end
	}));
}