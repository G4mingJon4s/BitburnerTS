import type { AutocompleteData, NS } from "@ns";
import { money } from "money";
import { table } from "table";
import { FILENAME } from "/network";

const FLAGS: [string, string | number | boolean][] = [
	["noNetwork", false],
	["noPartial", false],
];

export const PROGRAMS = ["SQLInject.exe", "HTTPWorm.exe", "relaySMTP.exe", "FTPCrack.exe", "BruteSSH.exe"];

export async function main(ns: NS) {
	const data = ns.flags(FLAGS);
	const noNetwork = data["noNetwork"] as boolean;
	const noPartial = data["noPartial"] as boolean;

	const bought = ns.singularity.purchaseTor();
	if (!bought) return ns.alert("Could not buy the router!");

	if (noPartial) {
		const combinedCost = PROGRAMS.reduce((acc, cur) => acc + ns.singularity.getDarkwebProgramCost(cur), 0);
		if (ns.getPlayer().money < combinedCost) return ns.alert(`You do not have enough money to buy all programs. You need $${money(combinedCost, 2)}.`);
	}

	const owned = PROGRAMS.map(p => ({
		name: p,
		isBought: ns.singularity.purchaseProgram(p)
	}));

	const tableData = owned.map(o => [o.name, o.isBought ? "True" : "False"]);
	const tableString = table(["Program", "Bought"], tableData);

	if (!noPartial) ns.tprintf("%s",tableString);
	if (!noNetwork) ns.run(FILENAME);
}

export function autocomplete(data: AutocompleteData, _args: string[]) {
	return [data.flags(FLAGS)];
}