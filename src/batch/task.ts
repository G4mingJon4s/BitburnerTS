import { NS } from "@ns";

export async function main(ns: NS) {
	const [id, type, target, test = false, duration = 0] = ns.args as [number, string, string, boolean?, number?];

	if (false) ns.grow;

	const start = Date.now();

	if (!test) switch(type) {
	case "H ": { await ns["hack"](target); break; }
	case "W1": { await ns["weaken"](target); break; }
	case "G ": { await ns["grow"](target); break; }
	case "W2": { await ns["weaken"](target); break; }
	} else await ns.sleep(duration);

	const end = Date.now();

	ns.writePort(ns.pid, JSON.stringify({
		descriptor: "REPORT",
		id,
		type,
		start,
		end
	}));
}