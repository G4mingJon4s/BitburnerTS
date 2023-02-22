import { NS } from "@ns";
import { objectToArray, table } from "/table";

export async function main(ns: NS) {
	ns.disableLog("ALL"); ns.clearLog(); ns.tail();
	const [server, performance] = ns.args as [string, boolean];

	while (true) {
		const obj = ns.getServer(server);
		const data = {
			"minDifficulty": obj.minDifficulty,
			"currentDifficulty": obj.hackDifficulty,
			"maxMoney": obj.moneyMax,
			"currentMoney": obj.moneyAvailable,
		};

		const tableString = table([`KEY${performance ? " - PERFORMANCE" : ""}`, "Value"], objectToArray(data));

		ns.clearLog();
		ns.printf("%s", tableString);
		if (performance) ns.resizeTail(600, 200);
		await ns.asleep(200);
	}
}