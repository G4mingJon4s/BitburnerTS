import type { NS } from "@ns";
import { outsourceNoException } from "/exploit/do";

export async function main(ns: NS) {
	ns.tail();

	const server = await outsourceNoException(ns, "bladeburner.getActionCountRemaining", "Operations", "Investigation");
	ns.tprint(JSON.stringify(server, undefined, 2));
}