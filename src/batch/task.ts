import { BasicHGWOptions, NS } from "@ns";

export async function main(ns: NS) {
	const [id, type, target, delay, pid] = ns.args as [number, string, string, number, number];

	if (false) ns.grow;

	const opts: BasicHGWOptions = { additionalMsec: delay };

	const start = Date.now();

	switch(type) {
	case "H ": { await ns["hack"](target, opts); break; }
	case "W1": { await ns["weaken"](target, opts); break; }
	case "G ": { await ns["grow"](target, opts); break; }
	case "W2": { await ns["weaken"](target, opts); break; }
	}

	const end = Date.now();

	ns.writePort(pid, JSON.stringify({
		descriptor: "TASK-REPORT",
		id,
		type,
		start,
		end,
		delay
	}));
}