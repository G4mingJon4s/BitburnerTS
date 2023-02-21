import { NS } from "@ns";

export async function main(ns: NS) {
	const allFoundContracts = ns.ls("home", ".cct");

	for (const contractName of allFoundContracts) solveContractSilent(ns, contractName, "home");
}

export function solveContractSilent(ns: NS, fileName: string, serverName: string) {
	if (!ns.serverExists(serverName)) return;
	if (!ns.ls(serverName).includes(fileName)) return;

	const regex = /^.+\.cct$/;
	if (!regex.test(fileName)) return;

	ns.rm(fileName, serverName); // never said I'd solve it did I?
}