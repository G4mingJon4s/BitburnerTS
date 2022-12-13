import { NS } from "@ns";
import { getAllContracts } from "cct/solver";
import { getAllServers } from "network";
import { table } from "table";

export async function main(ns: NS) {
	const contracts = getAllContracts(ns, getAllServers(ns));
	const refined: [string, string[]][] = contracts.filter(c => c.contracts.length > 0).map(c => ([
		c.name,
		c.contracts.map(n => ns.codingcontract.getContractType(n, c.name)),
	]));
	const tableString = table(["Server", "Contracts"], refined.map(e => [e[0], e[1].join(", ")]));

	ns.tprintf("%s", tableString);
}