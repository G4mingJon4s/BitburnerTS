import { NS } from "@ns";

export const type = "Subarray with Maximum Sum";
export const TESTAMT = 30;
export const TESTRATE = 1;

export function solve(data: string): string {
	return data;
}

export async function test(ns: NS, tests: string[]): Promise<void> {
	try {
		ns.disableLog("ALL"); ns.tail(); ns.resizeTail(1500, 500); ns.moveTail(10, 10);

		for (const test of tests) {
			if (!ns.fileExists(test, "home")) {
				ns.print(`File with name ${test} does not exist on "home".`);
				continue;
			}
			
			const data = ns.codingcontract.getData(test, "home") as string;
			const answer = solve(data);

			const result = ns.codingcontract.attempt(answer, test, "home");

			if (result.length > 0) ns.print(`SUCCESS: "${test}" finished correctly.`);
			else ns.print(`ERROR: "${test}" resulted in an error.\n Input : ${String(data)}\n Answer: ${String(answer)}`);

			await ns.asleep(1000 / TESTRATE);
			ns.resizeTail(1500, 500);
		}
	} catch (e) {
		return ns.alert(`Solving contract with type "${type}" resulted in an error:\n${String(e)}`);
	} finally {
		ns.print(`Solving contract with type "${type}" ended. You may close the window.`);
	}
}

export async function main(ns: NS): Promise<void> {
	for (let i = 0; i < TESTAMT; i++) ns.codingcontract.createDummyContract(type);

	const dummyContracts = ns.ls("home", ".cct").filter(name => ns.codingcontract.getContractType(name, "home") !== type);

	await test(ns, dummyContracts);
}