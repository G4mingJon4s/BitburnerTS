import { AutocompleteData, NS } from "@ns";
import { getAllContracts } from "cct/solver";
import { getAllServers } from "network";
import { table } from "table";

const FLAGS: [string, string | number | boolean][] = [
	["simple", false],
];

export async function main(ns: NS) {
	const data = ns.flags(FLAGS);
	const flags = (Object.entries(data) as [string, boolean][]).filter(a => a[0] !== "_").filter(a => a[1]).map(a => a[0]);
	const simple = flags.includes("simple");

	const contracts = getAllContracts(ns, getAllServers(ns));
	const refined: [string, string[]][] = contracts.filter(c => c.contracts.length > 0).map(c => ([
		c.name,
		c.contracts.map(n => ns.codingcontract.getContractType(n, c.name)),
	]));
	const tableString = table(["Server", "Contracts"], refined.map(e => [e[0], convertNames(e[1], simple)]));

	ns.tprintf("%s", tableString);
}

export function convertNames(names: string[], simple: boolean) {
	if (simple) return names.length.toString();
	return names.join(", ");
}

export function autocomplete(data: AutocompleteData, args: string[]) {
	return [data.flags(FLAGS)];
}