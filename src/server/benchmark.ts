import type { NS } from "@ns";
import { table } from "table";
import { money, time } from "money";
import { benchmarkServer, getHackableServers } from "batch/util";

export async function main(ns: NS) {
	const servers = getHackableServers(ns);

	const values = servers.flatMap(s => benchmarkServer(ns, s)).sort((a, b) => b.ramRate - a.ramRate).slice(0, 20);

	const tableString = table(["Server", "%", "Time", "$/s", "$/(s*GB)"], values.map(v => [v.server, v.percentage.toFixed(2), time(v.time), money(v.rate, 2), money(v.ramRate, 2)]));

	ns.tprintf("%s", tableString);
}