import { NS } from "@ns";
import { outsource } from "/exploit/do";

export async function main(ns:NS) {
	const result = await outsource(ns, "ns.stock.getSymbols");

	ns.tprint(result);
}