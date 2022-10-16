import { NS } from "@ns";
import { readFile } from "getter";

export async function main(ns:NS) {
	ns.disableLog("ALL"); ns.tprint("test");
	const doc = eval("document") as Document;
	const hook0 = doc.getElementById("overview-extra-hook-0");
	if (hook0 === null) throw new Error("no hook");

	const data = await readFile(ns, "gangNames.txt", "home");

	const converted = JSON.parse(data) as string[];

	ns.atExit(() => hook0.innerText = "");

	try {
		while (converted.length > 0) {
			hook0.innerText = converted.join("\n");
			converted.pop();
			await ns.sleep(Math.pow(converted.length, 1.5) * 10);
		}
	} catch {
		ns.tprint("no");
	}
}