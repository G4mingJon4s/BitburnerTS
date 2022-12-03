import { NS } from "@ns";
import { objectToArray, table } from "/table";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();
	const [server] = ns.args as [string];

	while (true) {
		const obj = ns.getServer(server);
		const data = {
			"minDifficulty": obj.minDifficulty,
			"currentDifficulty": obj.hackDifficulty,
			"maxMoney": obj.moneyMax,
			"currentMoney": obj.moneyAvailable,
		};

		const tableString = table(["Key", "Value"], objectToArray(data));

		ns.clearLog();
		ns.printf("%s", tableString);
		await ns.asleep(50);
	}
}