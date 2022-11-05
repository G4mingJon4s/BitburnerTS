import { NS } from "@ns";
import { run } from "/exploit/do";

export async function main(ns:NS) {
	const result = await run(ns, "ns.tprint", ["\"hahahahahahahaahahaha\""]);
	console.log(result);
}