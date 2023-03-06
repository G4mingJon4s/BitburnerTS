import { AutocompleteData, NS } from "@ns";
import { getAllServers } from "network";
import { CHARGEFILE, IGNOREDHOSTS } from "stanek/stanek";

export const WORKERFILE = "/stanek/worker.js";
export const STANEKFILE = "/stanek/stanek.js";
export const SERVERFILE = "server.js";
export const MONEYFILE = "money.js";
export const TABLEFILE = "table.js";
export const NETWORKFILE = "network.js";

const FLAGS: [string, string | number | boolean][] = [
	["killWorkers", false],
];

export function autocomplete(data: AutocompleteData, _args: string[]) {
	return [data.flags(FLAGS)];
}

export async function main(ns: NS) {
	const data = ns.flags(FLAGS);
	const killWorkers = data["killWorkers"] as boolean;

	const allServers = getAllServers(ns).filter(s => !IGNOREDHOSTS.includes(s));

	if (killWorkers) return void allServers.map(s => ns.scriptKill(WORKERFILE, s));

	allServers.map(s => ns.scp([WORKERFILE, STANEKFILE, SERVERFILE, MONEYFILE, TABLEFILE, CHARGEFILE, NETWORKFILE], s, "home"));
	return void allServers.map(s => ns.exec(WORKERFILE, s));
}